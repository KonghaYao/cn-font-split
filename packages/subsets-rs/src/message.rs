use cn_font_proto::api_interface::EventMessage;

pub trait EventFactory {
    fn create_end_message() -> EventMessage;
    fn output_data(name: &str, data: Vec<u8>) -> EventMessage;
}

impl EventFactory for EventMessage {
    fn create_end_message() -> EventMessage {
        EventMessage {
            event: "end".to_string(),
            message: "end".to_string(),
            data: None,
        }
    }
    fn output_data(name: &str, data: Vec<u8>) -> EventMessage {
        EventMessage {
            event: "output".to_string(),
            message: name.to_string(),
            data: Some(data),
        }
    }
}
