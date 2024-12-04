wget https://github.com/WebAssembly/binaryen/releases/download/version_119/binaryen-version_119-x86_64-linux.tar.gz
if [ ! -d "/opt/binaryen/" ]; then
  mkdir /opt/binaryen/
fi
tar xvf binaryen-version_119-x86_64-linux.tar.gz -C /opt/binaryen/
echo -e "\nexport PATH=\$PATH:/opt/binaryen/binaryen-version_119/bin\n" >> ~/.bashrc
