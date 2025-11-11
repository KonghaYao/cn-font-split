wget https://github.com/WebAssembly/binaryen/releases/download/version_124/binaryen-version_124-x86_64-linux.tar.gz
if [ ! -d "/opt/binaryen/" ]; then
  mkdir /opt/binaryen/
fi
tar xvf binaryen-version_124-x86_64-linux.tar.gz -C /opt/binaryen/
rm binaryen-version_124-x86_64-linux.tar.gz
echo "\nexport PATH=\$PATH:/opt/binaryen/binaryen-version_124/bin\n" >> ~/.bashrc
