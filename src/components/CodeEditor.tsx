import { useState, useEffect } from 'react';
import { SimulatedFile } from '../types';
import { Play, RotateCcw, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';

interface CodeEditorProps {
  files: SimulatedFile[];
  onFileChange: (fileName: string, newCode: string) => void;
  onResetFiles: () => void;
  onCompile: (compiledConfig: { bgColor: string; primaryColor: string; accentColor: string; title: string }) => void;
  isCompiling: boolean;
}

export default function CodeEditor({
  files,
  onFileChange,
  onResetFiles,
  onCompile,
  isCompiling,
}: CodeEditorProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(1); // Set kernel.c as default since it is most fun to modify
  const [compilerLogs, setCompilerLogs] = useState<string[]>([]);
  const [compileSuccess, setCompileSuccess] = useState<boolean | null>(null);

  const activeFile = files[activeFileIndex] || files[0];

  useEffect(() => {
    // Generate initial message
    setCompilerLogs([
      '系統就緒。你可以修改 kernel.c 的顏色或引導文本，然後點擊「編譯核心代碼」按鈕來測試。',
    ]);
  }, []);

  const handleCompiling = () => {
    setCompileSuccess(null);
    setCompilerLogs(['[SYS] 開始引導構建過程...', '[SYS] 正在讀取原始碼與連結描述檔...']);

    // Parse values from code to simulate compiler actions
    let foundBgColor = '#F1F5F9'; // Default Slate-100
    let foundPrimary = '#3B82F6'; // Blue-500
    let foundAccent = '#EF4444'; // Red-500
    let foundTitle = 'HobbyOS v0.1.2 Kernel (32-Bit Protected Mode)';

    // Find custom kernel.c
    const kernelFile = files.find((f) => f.name === 'kernel.c');
    const bootFile = files.find((f) => f.name === 'boot.asm');

    if (kernelFile) {
      // Background hex parsing (e.g., #define LIGHT_THEME_BG 0xF1F5F9)
      const bgMatch = kernelFile.code.match(/#define\s+LIGHT_THEME_BG\s+0x([0-9a-fA-F]+)/);
      if (bgMatch) {
         foundBgColor = `#${bgMatch[1]}`;
      }
      
      // Primary hex parsing (e.g., #define THEME_PRIMARY 0x3B82F6)
      const priMatch = kernelFile.code.match(/#define\s+THEME_PRIMARY\s+0x([0-9a-fA-F]+)/);
      if (priMatch) {
         foundPrimary = `#${priMatch[1]}`;
      }

      // Accent hex parsing (e.g., #define THEME_ACCENT 0xEF4444)
      const accMatch = kernelFile.code.match(/#define\s+THEME_ACCENT\s+0x([0-9a-fA-F]+)/);
      if (accMatch) {
         foundAccent = `#${accMatch[1]}`;
      }

      // Title parsing (e.g., "HobbyOS v0.1.2 Kernel (32-Bit Protected Mode)")
      const titleMatch = kernelFile.code.match(/draw_title_bar\s*\(\s*"(.*?)"\s*\)/);
      if (titleMatch) {
        foundTitle = titleMatch[1];
      }
    }

    setTimeout(() => {
      setCompilerLogs((prev) => [
        ...prev,
        `[ASM] nasm -f elf32 src/boot.asm -o build/boot.o`,
        `[ASM] 原始碼檔案：${bootFile?.name || 'boot.asm'} (大小 ${bootFile?.code.length || 0} 位元組)`,
        `[ASM] boot.asm 引導特徵碼 0xAA55 校驗成功。`,
      ]);
    }, 500);

    setTimeout(() => {
      setCompilerLogs((prev) => [
        ...prev,
        `[C] i686-elf-gcc -m32 -ffreestanding -O2 -c src/kernel.c -o build/kernel.o`,
        `[C] 偵測到配置：LIGHT_THEME_BG = ${foundBgColor}`,
        `[C] 偵測到配置：THEME_PRIMARY = ${foundPrimary}`,
        `[C] 偵測到配置：THEME_ACCENT = ${foundAccent}`,
        `[C] 偵測到標題位置："${foundTitle}"`,
      ]);
    }, 1100);

    setTimeout(() => {
      setCompilerLogs((prev) => [
        ...prev,
        `[LD] i686-elf-ld -T src/linker.ld -o build/kernel.elf build/boot.o build/kernel.o`,
        `[LD] objcopy -O binary build/kernel.elf dist/os-floppy.img`,
      ]);
    }, 1600);

    setTimeout(() => {
      setCompilerLogs((prev) => [
        ...prev,
        `[SYS] dist/os-floppy.img (1.44 MB) 構造完成！`,
        `[SYS] BIOS 裝載起點 0x7C00 特徵完好。核心在 0x1000 就緒。`,
      ]);
      setCompileSuccess(true);
      onCompile({
        bgColor: foundBgColor,
        primaryColor: foundPrimary,
        accentColor: foundAccent,
        title: foundTitle,
      });
    }, 2200);
  };

  return (
    <div id="code-editor-root" className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Tab Selectors */}
      <div className="flex items-center justify-between bg-slate-950 px-4 py-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {files.map((file, idx) => (
            <button
              id={`tab-button-${file.name}`}
              key={file.name}
              onClick={() => setActiveFileIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-t-lg transition-all ${
                activeFileIndex === idx
                  ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              {file.name}
            </button>
          ))}
        </div>
        <button
          id="btn-reset-code"
          onClick={onResetFiles}
          className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors text-xs font-medium py-1 px-2 hover:bg-rose-500/10 rounded-md"
          title="恢復預設核心程式碼"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置程式碼
        </button>
      </div>

      {/* Code description bar */}
      <div className="bg-slate-900 px-4 py-2 text-xs text-slate-400 border-b border-slate-800/80 italic font-sans flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        {activeFile.description}
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex gap-0 relative min-h-[300px]">
        {/* Line Numbers */}
        <div className="bg-slate-950/60 text-right px-3 py-4 font-mono text-xs select-none text-slate-600 border-r border-slate-800/40 w-12 flex flex-col">
          {Array.from({ length: activeFile.code.split('\n').length || 1 }).map((_, i) => (
            <div key={i} className="leading-6">{i + 1}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          id={`editor-${activeFile.name}`}
          value={activeFile.code}
          onChange={(e) => onFileChange(activeFile.name, e.target.value)}
          spellCheck={false}
          className="flex-1 w-full bg-transparent text-slate-200 p-4 font-mono text-xs leading-6 focus:outline-none resize-none overflow-y-auto whitespace-pre tab-size-4"
          style={{ tabSize: 4 }}
        />
      </div>

      {/* Action / Compiler Panel */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
          <div className="text-xs font-sans text-slate-400">
            嘗試修改 <code className="text-rose-400 px-1 py-0.5 bg-slate-900 rounded font-mono">kernel.c</code> 中的顏色定義如 
            <code className="text-yellow-400 px-1 py-0.5 bg-slate-900 rounded font-mono">0xEF4444</code>，並運行編譯。
          </div>
          <button
            id="btn-compile-now"
            onClick={handleCompiling}
            disabled={isCompiling}
            className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer ${
              isCompiling
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400'
            }`}
          >
            <Play className={`w-4 h-4 ${isCompiling ? 'animate-spin' : ''}`} />
            {isCompiling ? '編譯中...' : '編譯與連結檔案 ⚙️'}
          </button>
        </div>

        {/* Compiler console log */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3 font-mono text-xs max-h-48 overflow-y-auto flex flex-col gap-1.5 h-36">
          <div className="text-slate-500 border-b border-slate-800/60 pb-1 flex justify-between items-center">
            <span>編譯主控台 (Compiler Output)</span>
            {compileSuccess === true && (
              <span className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> 構建成功
              </span>
            )}
            {compileSuccess === false && (
              <span className="text-rose-400 flex items-center gap-1.5 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" /> 構建失敗
              </span>
            )}
          </div>
          {compilerLogs.map((log, lIdx) => {
            let className = 'text-slate-300';
            if (log.startsWith('[SUCCESS]')) className = 'text-emerald-400 font-bold';
            else if (log.startsWith('[SYS]')) className = 'text-cyan-400';
            else if (log.startsWith('[ASM]')) className = 'text-indigo-300';
            else if (log.startsWith('[C]')) className = 'text-amber-300';
            else if (log.startsWith('[LD]')) className = 'text-pink-300';
            else if (log.includes('成功')) className = 'text-emerald-500';

            return (
              <div key={lIdx} className={`leading-5 ${className}`}>
                {log}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
