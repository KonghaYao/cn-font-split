use std::collections::HashMap;
use std::env;
use s3::creds::Credentials;
use s3::{bucket, Bucket, BucketConfiguration, Region};


pub struct OssApi {
    pub base_url: String,
    pub region: Region,
    pub credentials: Credentials,
}
impl OssApi {
    fn new(base_url: &str) -> OssApi {
        let s3_ak = env::var("S3_AK").expect("S3_AK must be set");
        let s3_sk = env::var("S3_SK").expect("S3_SK must be set");
        let s3_region = env::var("S3_REGION").unwrap_or("us-west-2".to_owned());
        let s3_endpoint = env::var("S3_ENDPOINT").expect("S3_ENDPOINT must be set");
        let region = Region::Custom {
            region: s3_region,
            endpoint: s3_endpoint,
        };
        let credentials = Credentials::new(
            Some(&s3_ak),
            Some(&s3_sk),
            None,
            None,
            Some(&"static".to_string()),
        ).unwrap();
        OssApi {
            base_url: base_url.to_string(),
            credentials,
            region,
        }
    }
    async fn create_bucket(&self, bucket_name: &str, config: BucketConfiguration) -> Box<Bucket> {
        let bucket =
            Bucket::new(bucket_name, self.region.clone(), self.credentials.clone()).unwrap().with_path_style();

        if !bucket.exists().await.unwrap() {
            let res = Bucket::create_with_path_style(
                bucket_name,
                self.region.clone(),
                self.credentials.clone(),
                config.clone(),
            )
                .await.unwrap();
            println!("create bucket => {}", bucket_name);
            res.bucket
        } else {
            println!(" found bucket => {}", bucket_name);
            bucket
        }
    }
    pub fn get_bucket(&self, bucket_name: &str) -> Box<Bucket> {
        Bucket::new(bucket_name, self.region.clone(), self.credentials.clone()).unwrap().with_path_style()
    }
}

impl OssApi {
    /// 初始化系统，将会自动查找并创建桶
    async fn init_font_system(&self) -> bool {
        self.create_bucket("origin-font", BucketConfiguration::default()).await;
        self.create_bucket("result-font", BucketConfiguration::default()).await;

        true
    }
}

fn init_env() -> OssApi {
    env::set_var("S3_ENDPOINT", "https://play.min.io:9000");
    env::set_var("S3_AK", "Q3AM3UQ867SPQQA43P2F");
    env::set_var("S3_SK", "zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG");
    env::set_var("S3_REGION", "us-east-1");
    OssApi::new("https://play.min.io:9000/")
}
#[tokio::test]
async fn upload_file() {
    let oss = init_env();
    oss.init_font_system().await;
    let bucket = oss.get_bucket("origin-font");
    let s3_path = "test.file";
    let test = b"I'm going to S3!";
    bucket.put_object(s3_path, test).await.expect("Failed to put file");
    let cb = bucket.get_object(s3_path).await.expect("Failed to get file");
    assert_eq!(cb.to_vec(), test);
}
