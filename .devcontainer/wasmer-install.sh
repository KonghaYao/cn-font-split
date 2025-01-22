curl https://get.wasmer.io -sSfL -o wasmer.sh
sed -i 's/github.com/ghproxy.cn\/github.com/g' wasmer.sh
sh wasmer.sh
rm wasmer.sh