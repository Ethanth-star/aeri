use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub const FRAME_SYNC: u8 = 0xAA;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareEvent {
    pub cmd: u8,
    pub data_h: u8,
    pub data_l: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareStatus {
    pub connected: bool,
    pub port: Option<String>,
    pub baud_rate: u32,
}

struct SerialHandle {
    port_name: String,
    baud_rate: u32,
    stop_signal: Arc<AtomicBool>,
    writer_tx: std::sync::mpsc::Sender<Vec<u8>>,
}

pub struct HardwareState {
    handle: Mutex<Option<SerialHandle>>,
}

impl HardwareState {
    pub fn new() -> Self {
        Self {
            handle: Mutex::new(None),
        }
    }
}

/// 扫描系统中所有可用的串口
pub fn scan_ports() -> Vec<String> {
    match serialport::available_ports() {
        Ok(ports) => ports.into_iter().map(|p| p.port_name).collect(),
        Err(_) => Vec::new(),
    }
}

/// 连接指定串口
pub fn connect(
    app: AppHandle,
    state: &HardwareState,
    port_name: String,
    baud_rate: u32,
) -> Result<(), String> {
    let mut handle_lock = state.handle.lock().map_err(|e| e.to_string())?;

    // 如果已连接相同或其它端口，先断开
    if let Some(old) = handle_lock.take() {
        old.stop_signal.store(true, Ordering::SeqCst);
    }

    let port_res = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(50))
        .open();

    let mut port = port_res.map_err(|e| format!("打开串口 {} 失败: {}", port_name, e))?;

    let (writer_tx, writer_rx) = std::sync::mpsc::channel::<Vec<u8>>();
    let stop_signal = Arc::new(AtomicBool::new(false));

    let stop_for_thread = stop_signal.clone();
    let app_clone = app.clone();

    // 启动后台 I/O 线程
    std::thread::spawn(move || {
        let mut read_buf = [0u8; 64];
        let mut frame_buf: Vec<u8> = Vec::with_capacity(128);

        while !stop_for_thread.load(Ordering::SeqCst) {
            // 1. 处理发送队列
            while let Ok(data_to_send) = writer_rx.try_recv() {
                if let Err(e) = port.write_all(&data_to_send) {
                    eprintln!("串口写入失败: {}", e);
                }
                let _ = port.flush();
            }

            // 2. 处理接收数据
            match port.read(&mut read_buf) {
                Ok(n) if n > 0 => {
                    frame_buf.extend_from_slice(&read_buf[..n]);

                    // 解析定长 5 字节帧: [0xAA, CMD, DATA_H, DATA_L, CHECKSUM]
                    while frame_buf.len() >= 5 {
                        if frame_buf[0] != FRAME_SYNC {
                            // 寻找下一个 0xAA 同步头
                            if let Some(idx) = frame_buf.iter().position(|&b| b == FRAME_SYNC) {
                                frame_buf.drain(0..idx);
                                if frame_buf.len() < 5 {
                                    break;
                                }
                            } else {
                                frame_buf.clear();
                                break;
                            }
                        }

                        // 此时 frame_buf[0] == 0xAA 且长度 >= 5
                        let cmd = frame_buf[1];
                        let data_h = frame_buf[2];
                        let data_l = frame_buf[3];
                        let checksum = frame_buf[4];
                        let expected = ((cmd as u16 + data_h as u16 + data_l as u16) & 0xFF) as u8;

                        if checksum == expected {
                            // 校验通过，派发事件
                            let event = HardwareEvent {
                                cmd,
                                data_h,
                                data_l,
                            };
                            let _ = app_clone.emit("hardware_event", event);
                            // 消费掉这 5 个字节
                            frame_buf.drain(0..5);
                        } else {
                            // 校验失败，可能是伪同步头，丢弃第一个字节继续搜索
                            frame_buf.remove(0);
                        }
                    }
                }
                Ok(_) => {}
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {}
                Err(e) => {
                    eprintln!("串口读取异常 (可能已拔出): {}", e);
                    break;
                }
            }

            std::thread::sleep(Duration::from_millis(5));
        }

        // 通知前端断开
        let _ = app_clone.emit(
            "hardware_status_changed",
            HardwareStatus {
                connected: false,
                port: None,
                baud_rate,
            },
        );
    });

    *handle_lock = Some(SerialHandle {
        port_name: port_name.clone(),
        baud_rate,
        stop_signal,
        writer_tx,
    });

    let _ = app.emit(
        "hardware_status_changed",
        HardwareStatus {
            connected: true,
            port: Some(port_name),
            baud_rate,
        },
    );

    Ok(())
}

/// 断开当前串口
pub fn disconnect(app: &AppHandle, state: &HardwareState) -> Result<(), String> {
    let mut handle_lock = state.handle.lock().map_err(|e| e.to_string())?;
    if let Some(h) = handle_lock.take() {
        h.stop_signal.store(true, Ordering::SeqCst);
    }

    let _ = app.emit(
        "hardware_status_changed",
        HardwareStatus {
            connected: false,
            port: None,
            baud_rate: 115200,
        },
    );

    Ok(())
}

/// 发送 5 字节命令包
pub fn send_command(
    state: &HardwareState,
    cmd: u8,
    data_h: u8,
    data_l: u8,
) -> Result<(), String> {
    let handle_lock = state.handle.lock().map_err(|e| e.to_string())?;
    if let Some(ref h) = *handle_lock {
        let checksum = ((cmd as u16 + data_h as u16 + data_l as u16) & 0xFF) as u8;
        let frame = vec![FRAME_SYNC, cmd, data_h, data_l, checksum];
        h.writer_tx
            .send(frame)
            .map_err(|e| format!("发送指令失败: {}", e))?;
        Ok(())
    } else {
        Err("串口未连接".to_string())
    }
}

/// 发送 TTS 语音文本到 STC-B 单片机 (通过 SM 软件串口转交语音合成模块)
pub fn send_tts_text(
    state: &HardwareState,
    text: &str,
) -> Result<(), String> {
    let handle_lock = state.handle.lock().map_err(|e| e.to_string())?;
    if let Some(ref h) = *handle_lock {
        // 自动附加音量最大控制标签 <V>4，确保声音清晰响亮
        let full_text = if text.starts_with("<V>") {
            text.to_string()
        } else {
            format!("<V>4{}", text)
        };

        // 1. 转为 GBK 编码
        let (gbk_bytes, _, _) = encoding_rs::GBK.encode(&full_text);

        // 限制最大长度不超过 130 字节 (模块缓冲区为 150 字节)
        let bytes_to_send = if gbk_bytes.len() > 130 {
            &gbk_bytes[..130]
        } else {
            &gbk_bytes[..]
        };

        let total_len = bytes_to_send.len() as u8;
        if total_len == 0 {
            return Ok(());
        }

        // 2. 发送 CMD_TTS_START (0x15)
        let start_cs = ((0x15u16 + total_len as u16 + 0) & 0xFF) as u8;
        h.writer_tx
            .send(vec![FRAME_SYNC, 0x15, total_len, 0, start_cs])
            .map_err(|e| format!("发送 TTS_START 失败: {}", e))?;
        std::thread::sleep(Duration::from_millis(3));

        // 3. 每 2 个字节分包发送 CMD_TTS_DATA (0x16)
        let mut idx = 0;
        while idx < bytes_to_send.len() {
            let b1 = bytes_to_send[idx];
            let b2 = if idx + 1 < bytes_to_send.len() {
                bytes_to_send[idx + 1]
            } else {
                0
            };
            let cs = ((0x16u16 + b1 as u16 + b2 as u16) & 0xFF) as u8;
            h.writer_tx
                .send(vec![FRAME_SYNC, 0x16, b1, b2, cs])
                .map_err(|e| format!("发送 TTS_DATA 失败: {}", e))?;
            std::thread::sleep(Duration::from_millis(3));
            idx += 2;
        }

        // 4. 发送 CMD_TTS_END (0x17)
        let end_cs = ((0x17u16 + total_len as u16 + 0) & 0xFF) as u8;
        h.writer_tx
            .send(vec![FRAME_SYNC, 0x17, total_len, 0, end_cs])
            .map_err(|e| format!("发送 TTS_END 失败: {}", e))?;

        Ok(())
    } else {
        Err("串口未连接".to_string())
    }
}

/// 获取当前连接状态
pub fn get_status(state: &HardwareState) -> HardwareStatus {
    if let Ok(handle_lock) = state.handle.lock() {
        if let Some(ref h) = *handle_lock {
            return HardwareStatus {
                connected: true,
                port: Some(h.port_name.clone()),
                baud_rate: h.baud_rate,
            };
        }
    }
    HardwareStatus {
        connected: false,
        port: None,
        baud_rate: 115200,
    }
}
