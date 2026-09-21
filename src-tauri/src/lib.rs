use std::path::Path;
use tauri::ipc::Response;

const MAX_PDF_BYTES: u64 = 1024 * 1024 * 1024;

#[tauri::command]
fn read_pdf(path: String) -> Result<Response, String> {
    let pdf_path = Path::new(&path);
    let is_pdf = pdf_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("pdf"));
    if !is_pdf {
        return Err("只能打开 PDF 文件".into());
    }

    let metadata = std::fs::metadata(pdf_path).map_err(|_| "文件不存在或无法读取")?;
    if !metadata.is_file() {
        return Err("所选路径不是文件".into());
    }
    if metadata.len() > MAX_PDF_BYTES {
        return Err("PDF 文件超过 1 GB 限制".into());
    }

    let bytes = std::fs::read(pdf_path).map_err(|_| "文件不存在或无法读取")?;
    Ok(Response::new(bytes))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_pdf])
        .run(tauri::generate_context!())
        .expect("error while running PDF Pair");
}
