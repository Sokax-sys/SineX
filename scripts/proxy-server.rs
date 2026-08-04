// A simple TMDB proxy server for development.
// Routes http://localhost:9901/tmdb/* -> https://api.themoviedb.org/3/*
// Run: rustc scripts/proxy-server.rs -o scripts/proxy-server.exe && scripts/proxy-server.exe
use std::io::prelude::*;
use std::net::{TcpListener, TcpStream};
use std::thread;

fn handle_client(mut stream: TcpStream) {
    let mut buf = Vec::new();
    let mut header_buf = [0u8; 4096];
    loop {
        let n = match stream.read(&mut header_buf) {
            Ok(0) => return,
            Ok(n) => n,
            Err(_) => return,
        };
        buf.extend_from_slice(&header_buf[..n]);
        if buf.wrapping_contains(&[b'\r', b'\n', b'\r', b'\n']) || buf.wrapping_contains(&[b'\n', b'\n']) {
            break;
        }
        if buf.len() > 8192 { return; }
    }
    let request = String::from_utf8_lossy(&buf);
    if !request.contains("/tmdb/") {
        let _ = stream.write_all(b"HTTP/1.1 400 Bad Request\r\n\r\n");
        return;
    }

    let response = match get_tmdb(&request) {
        Ok(body) => format!("HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}", body.len(), body),
        Err(e) => format!("HTTP/1.1 502 Bad Gateway\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\n\r\n{{\"error\":\"{}\"}}", e.replace('"', "\\\"")),
    };
    let _ = stream.write_all(response.as_bytes());
}

fn main() {
    let listener = TcpListener::bind("0.0.0.0:9901").expect("bind 9901");
    eprintln!("Proxy server on port 9901");
    for stream in listener.incoming() {
        if let Ok(stream) = stream {
            thread::spawn(|| handle_client(stream));
        }
    }
}
