import React, { useState, useRef } from 'react';

export default function App() {
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [text, setText] = useState(
    '汉体书写信息技术标准组件',
  );
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const appendLog = (msg: string) =>
    setLog((prev) => [...prev, msg]);

  const handleSplit = async () => {
    if (!fontFile) return alert('请选择字体文件！');
    setLoading(true);
    setLog([]);
    appendLog('开始读取字体...');

    try {
      // 动态加载 cn-font-split 的浏览器版
      const { fontSplit } = await import(
        /* webpackChunkName: "font-split" */
        '@konghayao/cn-font-split/dist/browser/index.mjs'
      );

      appendLog('正在分包...');
      const buffer = await fontFile.arrayBuffer();
      const result = await fontSplit({
        font: new Uint8Array(buffer),
        text,
        destPath: '/', // 仅内存
        previewImage: false,
      });

      appendLog(`分包完成，共 ${result.length} 个文件`);
      // 下载 zip
      const zipBlob = new Blob([result[0].data], {
        type: 'font/woff2',
      });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fontFile.name}.subset.woff2`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      appendLog(`❌ ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper">
      <header>
        <h1>在线字体分包器</h1>
        <p>上传字体 → 输入文字 → 下载子集</p>
      </header>

      <section>
        <label>
          1. 选择字体：
          <input
            type="file"
            accept=".ttf,.otf,.woff2"
            ref={fileRef}
            onChange={(e) => setFontFile(e.target.files?.[0] ?? null)}
          />
          {fontFile && <span> {fontFile.name}</span>}
        </label>

        <label>
          2. 输入文字：
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>

        <button onClick={handleSplit} disabled={loading}>
          {loading ? '处理中...' : '3. 开始分包'}
        </button>
      </section>

      <aside>
        <h3>日志</h3>
        <pre>
          {log.length === 0
            ? '暂无日志'
            : log.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
        </pre>
      </aside>

      <footer>
        <a href="https://github.com/yCENzh/cn-font-split" target="_blank" rel="noreferrer">
          GitHub 源码
        </a>
      </footer>
    </div>
  );
}
