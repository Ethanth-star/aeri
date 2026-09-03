pub mod serial;

pub use serial::{
    connect, disconnect, get_status, scan_ports, send_command, HardwareEvent, HardwareState,
    HardwareStatus,
};
