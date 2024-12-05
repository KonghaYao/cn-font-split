curl https://get.wasmer.io -sSfL -o wasmer.sh
sed -i 's/github.com/github.moeyy.xyz\/github.com/g' wasmer.sh
sh wasmer.sh
rm wasmer.sh