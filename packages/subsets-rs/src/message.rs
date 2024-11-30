use cn_font_proto::api_interface::{EventMessage, EventName};

pub trait EventFactory {
    fn create_end_message() -> EventMessage;
    fn output_data(name: &str, data: Vec<u8>) -> EventMessage;
}

impl EventFactory for EventMessage {
    fn create_end_message() -> EventMessage {
        EventMessage {
            event: EventName::End.into(),
            message: "end".to_string(),
            data: None,
        }
    }
    fn output_data(name: &str, data: Vec<u8>) -> EventMessage {
        EventMessage {
            event: EventName::OutputData.into(),
            message: name.to_string(),
            data: Some(data),
        }
    }
}
