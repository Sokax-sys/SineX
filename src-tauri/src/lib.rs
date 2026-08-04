use std::net::{IpAddr, Ipv4Addr, SocketAddr};

#[tauri::command]
fn log_error(source: String, message: String, detail: String) {
    log::error!("[SINEX_ERR] {source}: {message} | {detail}");
}

#[tauri::command]
async fn tmdb_proxy(url: String, headers: Vec<(String, String)>) -> Result<String, String> {
    // resolve via Cloudflare DoH + direct connection
    let doh_client = reqwest::Client::builder()
        .resolve(
            "cloudflare-dns.com",
            SocketAddr::new(IpAddr::V4(Ipv4Addr::new(1, 1, 1, 1)), 443),
        )
        .resolve(
            "cloudflare-dns.com",
            SocketAddr::new(IpAddr::V4(Ipv4Addr::new(1, 0, 0, 1)), 443),
        )
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("SineX/2.4")
        .build()
        .map_err(|e| format!("doh client: {e}"))?;

    let host = url
        .strip_prefix("https://")
        .and_then(|s| s.split('/').next())
        .unwrap_or("api.themoviedb.org");

    let doh_url = format!("https://cloudflare-dns.com/dns-query?name={host}&type=A");
    let doh_resp = doh_client
        .get(&doh_url)
        .header("accept", "application/dns-json")
        .send()
        .await
        .map_err(|e| format!("doh query: {e}"))?;

    let doh_json: serde_json::Value = doh_resp
        .json()
        .await
        .map_err(|e| format!("doh parse: {e}"))?;

    let ip = doh_json["Answer"]
        .as_array()
        .and_then(|answers| {
            answers.iter().find_map(|ans| {
                if ans["type"].as_i64() == Some(1) {
                    ans["data"].as_str().map(|s| s.to_string())
                } else {
                    None
                }
            })
        })
        .ok_or_else(|| "no A record found".to_string())?;

    let ip_addr: IpAddr = ip.parse().map_err(|e| format!("bad ip: {e}"))?;

    let client = reqwest::Client::builder()
        .resolve("api.themoviedb.org", SocketAddr::new(ip_addr, 443))
        .resolve("api.themoviedb.org", SocketAddr::new(ip_addr, 443))
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("SineX/2.4")
        .build()
        .map_err(|e| format!("tmdb client: {e}"))?;

    let mut req = client.get(&url);
    for (k, v) in &headers {
        req = req.header(k.as_str(), v.as_str());
    }
    let resp = req.send().await.map_err(|e| {
        format!(
            "tmdb req to {ip} ({host}): {e} (timeout:{}, connect:{}, request:{})",
            e.is_timeout(),
            e.is_connect(),
            e.is_request()
        )
    })?;
    let body = resp.text().await.map_err(|e| format!("tmdb body: {e}"))?;
    Ok(body)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![log_error, tmdb_proxy])
        .setup(|app| {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
