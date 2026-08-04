use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

const PORT: u16 = 9900;

fn handle_client(mut stream: TcpStream) {
    let mut buf = vec![0u8; 65536];
    let Ok(n) = stream.read(&mut buf) else { return };
    if n == 0 { return }
    let request = String::from_utf8_lossy(&buf[..n]);
    let first_line = request.lines().next().unwrap_or("");
    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 2 {
        let _ = stream.write_all(b"HTTP/1.0 400 Bad Request\r\nAccess-Control-Allow-Origin: *\r\n\r\n");
        return;
    }
    let path = parts[1];
    let response = if path.starts_with("/tmdb") {
        proxy_tmdb(path)
    } else {
        "HTTP/1.0 200 OK\r\nAccess-Control-Allow-Origin: *\r\n\r\nok".to_string()
    };
    let _ = stream.write_all(response.as_bytes());
}

fn proxy_tmdb(path: &str) -> String {
    let tmdb_path = path.strip_prefix("/tmdb").unwrap_or(path);
    let url = format!("https://api.themoviedb.org/3{}", tmdb_path);
    eprintln!("Proxying: {}", url);

    // Retry up to 3 times for transient TLS errors (exit code 35)
    for attempt in 0..3 {
        let (tx, rx) = mpsc::channel();
        let url_clone = url.clone();
        thread::spawn(move || {
            let result = Command::new("C:\\Windows\\System32\\curl.exe")
                .args(["-s", "--ssl-no-revoke", "--retry", "2", "-w", "\n%{http_code}", &url_clone])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output();
            let _ = tx.send(result);
        });

        let result = rx.recv_timeout(Duration::from_secs(25))
            .unwrap_or_else(|_| Err(std::io::Error::new(std::io::ErrorKind::TimedOut, "curl timeout")));

        match result {
            Ok(out) => {
                let stderr = String::from_utf8_lossy(&out.stderr);
                if out.status.success() {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    let last_newline = stdout.rfind('\n');
                    if let Some(pos) = last_newline {
                        let body = &stdout[..pos];
                        let code_str = stdout[pos + 1..].trim();
                        let status_code: u16 = code_str.parse().unwrap_or(502);
                        return format!(
                            "HTTP/1.0 {} {}\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            status_code,
                            if status_code == 200 { "OK" } else { "Error" },
                            body.len(),
                            body
                        );
                    } else {
                        let body = stdout.trim();
                        return format!(
                            "HTTP/1.0 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                    }
                } else if attempt < 2 {
                    eprintln!("curl attempt {} failed (exit code {}): {} - retrying", attempt + 1, out.status.code().unwrap_or(-1), stderr.trim());
                    thread::sleep(Duration::from_millis(500));
                    continue;
                } else {
                    let detail = format!("curl exit code {}: {}", out.status.code().unwrap_or(-1), stderr.trim());
                    eprintln!("Proxy error: {}", detail);
                    let body = format!("{{\"error\":\"{}\"}}", detail.replace('"', "'").replace('\n', " "));
                    return format!(
                        "HTTP/1.0 502 Bad Gateway\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        body.len(),
                        body
                    );
                }
            }
            Err(e) => {
                eprintln!("Proxy error: {}", e);
                let body = format!("{{\"error\":\"{}\"}}", e.to_string().replace('"', "'"));
                return format!(
                    "HTTP/1.0 502 Bad Gateway\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
            }
        }
    }
    unreachable!()
}

fn main() {
    let addr = format!("0.0.0.0:{}", PORT);
    let listener = TcpListener::bind(&addr).expect("Failed to bind");
    eprintln!("TMDB proxy listening on {}", addr);
    for stream in listener.incoming() {
        match stream {
            Ok(s) => { thread::spawn(|| handle_client(s)); }
            Err(e) => eprintln!("Accept error: {}", e),
        }
    }
}
