import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// 显示运行时错误到页面
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:40px;font-family:sans-serif">
      <h2 style="color:#dc2626">应用加载出错</h2>
      <pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow:auto;font-size:13px">${event.error?.stack || event.message || '未知错误'}</pre>
    </div>`;
  }
});

try {
  const root = document.getElementById('root')!;
  createRoot(root).render(<App />);
} catch (e) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:40px;font-family:sans-serif">
      <h2 style="color:#dc2626">渲染失败</h2>
      <pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow:auto;font-size:13px">${e instanceof Error ? e.stack : String(e)}</pre>
    </div>`;
  }
}
