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
