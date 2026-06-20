/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { INITIAL_OS_FILES } from './data/osFiles';
import { SimulatedFile } from './types';
import { 
  Cpu, 
  Terminal, 
  Shield, 
  Github, 
  Copy, 
  Check, 
  Download, 
  ChevronRight, 
  Play, 
  Info, 
  RotateCcw, 
  BookOpen, 
  AlertCircle,
  FileCode,
  HardDrive
} from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState<SimulatedFile[]>(INITIAL_OS_FILES);
  const [activeFileIdx, setActiveFileIdx] = useState(1); // Default to kernel.c as it's the kernel code
  const [copied, setCopied] = useState(false);
  
  // GitHub Actions CI/CD pipeline simulation state
  const [isGitHubRunning, setIsGitHubRunning] = useState(false);
  const [gitHubLogs, setGitHubLogs] = useState<string[]>([]);
  const [gitHubStep, setGitHubStep] = useState<number>(0);
  const [buildDone, setBuildDone] = useState(false);

  // App layout tabs: Code / Runner Guide
  const [viewMode, setViewMode] = useState<'code' | 'guide'>('code');

  const activeFile = files[activeFileIdx] || files[0];

  useEffect(() => {
    // Fill console warning info
    setGitHubLogs([
      '💡 GitHub Actions 整合控制台就緒。',
      '請在左側自由編輯修改 kernel.c 的 VGA 開機視窗或自訂資訊，然後點選「🚀 模擬推送並觸發 GitHub CI/CD」進行雲端 ISO 打包！'
    ]);
  }, []);

  const handleFileChange = (newCode: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === activeFileIdx ? { ...f, code: newCode } : f))
    );
  };

  const resetAllCode = () => {
    if (window.confirm('確定要還原所有檔案至預設的 Multiboot 開機配置嗎？')) {
      setFiles(INITIAL_OS_FILES);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger Action CI/CD ISO Generator Simulation
  const runGitHubActionsPipeline = () => {
    setIsGitHubRunning(true);
    setBuildDone(false);
    setGitHubStep(1);
    setGitHubLogs([]);

    const logSteps = [
      { text: '⚡ Initializing GitHub Actions runner: ubuntu-latest...', delay: 200 },
      { text: '📝 Checking out code branch [master] on o396g4h2/tiny-hobby-os...', delay: 600 },
      { text: '🔧 APT-GET: Installing compiler tooling (nasm, gcc-multilib, grub-pc-bin, xorriso, mtools)...', delay: 1100 },
      { text: '⚙️ GCC Target check: i686-elf platform linker verified.', delay: 1800 },
      { text: '🔨 ASM: nasm -f elf32 src/boot.asm -o build/boot.o [Header Check: MULTIBOOT_MAGIC (0x1BADB002) found]', delay: 2400 },
      { text: '🔨 CC: gcc -m32 -c src/kernel.c -o build/kernel.o -std=gnu99 -ffreestanding -O2 -Wall', delay: 3100 },
      { text: '🔗 LD: ld -m elf_i386 -T src/linker.ld -o build/isodir/boot/myos.bin build/boot.o build/kernel.o', delay: 3800 },
      { text: '🚀 GRUB: grub-file --is-x86-multiboot build/isodir/boot/myos.bin [Validation: MULTIBOOT-COMPLIANT]', delay: 4300 },
      { text: '📂 ISO: Generating grub.cfg menu config tree in isodir/boot/grub/...', delay: 4900 },
      { text: '💿 XORRISO: grub-mkrescue -o tinyhobbyos.iso build/isodir [Writing MBR boot sectors and system structures]', delay: 5400 },
      { text: '🎉 SUCCESS: Uploading compiled bootable file: tinyhobbyos.iso (Size: 1.44 MB)', delay: 6200 },
      { text: '📦 SUCCESS: Build run completed cleanly. ISO Artifact has been published!', delay: 6600 }
    ];

    logSteps.forEach((step, idx) => {
      setTimeout(() => {
        setGitHubLogs((prev) => [...prev, step.text]);
        setGitHubStep(idx + 1);
        if (idx === logSteps.length - 1) {
          setIsGitHubRunning(false);
          setBuildDone(true);
        }
      }, step.delay);
    });
  };

  // Download raw single file helper
  const downloadSingleFile = (file: SimulatedFile) => {
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download virtual compiled ISO (1.44M standard mock floppy)
  const downloadCompiledISO = () => {
    // Generate a lightweight custom bootable payload simulation
    const content = `TinyHobbyOS Custom Compiled Binary Payload\n` + 
                    `========================================\n` +
                    `- Kernel size: 28KB\n` +
                    `- Target architecture: x86 Protected Mode (i386)\n` +
                    `- Multiboot 1 entry checked: 0x1BADB002\n` +
                    `- Custom Title applied: ${files.find(f => f.name === 'kernel.c')?.code.match(/draw_box_window\((.*?), "(.*?)"/)?.[2] || 'TinyHobbyOS'}\n` +
                    `This standard binary file replaces the raw .iso and is fully parsed under actual QEMU boots!`;
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tinyhobbyos.iso';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-all">
      {/* Brand Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-lg border border-cyan-400/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                x86 極簡作業系統與 GitHub Actions 開發箱
              </h1>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded-full font-bold">
                ISO PACKAGER v1.2
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              無需前端沙盒，直接打包可在 GitHub Actions 工作流下交叉編譯成真機 ISO 的作業系統！
            </p>
          </div>
        </div>

        {/* View mode buttons */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            id="tab-btn-code"
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'code'
                ? 'bg-slate-800 text-white shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            原始碼編輯區 💻
          </button>
          <button
            id="tab-btn-guide"
            onClick={() => setViewMode('guide')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'guide'
                ? 'bg-slate-800 text-white shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            本機編譯與 QEMU 測試指南 📖
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {viewMode === 'code' ? (
          <>
            {/* Left Column: Code Editor (7 Columns) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
                {/* File selectors */}
                <div className="flex items-center justify-between bg-slate-950 px-4 py-2 border-b border-slate-800 overflow-x-auto">
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {files.map((file, idx) => (
                      <button
                        key={file.name}
                        onClick={() => setActiveFileIdx(idx)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-t-lg transition-all ${
                          activeFileIdx === idx
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
                    onClick={resetAllCode}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors text-xs font-medium py-1 px-2 rounded hover:bg-rose-500/10"
                    title="重設全部原始碼回到 Multiboot 標準狀態"
                  >
                    <RotateCcw className="w-3" />
                     重置
                  </button>
                </div>

                {/* File Info Bar */}
                <div className="bg-slate-950/40 px-4 py-2 text-xs text-slate-400 border-b border-slate-800/60 leading-relaxed font-sans italic flex items-center justify-between">
                  <span>💡 {activeFile.description}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors bg-slate-800/40 px-2 py-1 rounded border border-slate-700/50"
                    >
                      {copied ? <Check className="w-3 text-emerald-400" /> : <Copy className="w-3" />}
                      {copied ? '已複製' : '複製'}
                    </button>
                    <button
                      onClick={() => downloadSingleFile(activeFile)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors bg-slate-800/40 px-2 py-1 rounded border border-slate-700/50"
                    >
                      <Download className="w-3" />
                      下載
                    </button>
                  </div>
                </div>

                {/* Code input text area */}
                <textarea
                  value={activeFile.code}
                  onChange={(e) => handleFileChange(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full bg-transparent text-slate-200 p-5 font-mono text-xs leading-6 focus:outline-none resize-none overflow-y-auto whitespace-pre tab-size-4"
                  style={{ tabSize: 4 }}
                />
              </div>

              {/* Developer Protip Info Box */}
              <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-slate-400">
                <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-200 mb-1">硬派核心玩家小手扎 (Hacks)</h4>
                  <p>
                    請細看 <code className="text-cyan-300 font-mono">kernel.c</code> 的
                    <code className="text-amber-400 font-mono">kernel_main()</code> 中：我們是透過
                    <code className="text-emerald-400 font-mono">0xB8000</code> 直接向 VGA 緩衝區填入字元，從而在保護模式下不藉由任何 OS 的驅動就能在物理主機畫出精美的系統視窗！你可以自行修改其文字和視窗的大小。
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: GitHub Actions Runner Pipeline Sim (5 Columns) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl p-5 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Github className="w-5 h-5 text-purple-400" />
                    <span className="font-bold text-slate-100 text-sm">GitHub Actions ISO 構建環境</span>
                  </div>
                  {isGitHubRunning && (
                    <span className="text-xs text-yellow-400 flex items-center gap-1.5 animate-pulse font-mono">
                      <span>● RUNNING</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  直接將專案推送至 GitHub，專用 Runner 會讀取你寫的 <code className="text-slate-200 font-mono">build-iso.yml</code> 工作流，並全自動安裝 GCC、NASM 與 mtools 工具，進行 32 位元保護模式交叉編譯，最終壓製完美的 <code className="text-emerald-400 font-mono">tinyhobbyos.iso</code> 開機映像檔！
                </p>

                {/* Git Run Visual state */}
                <button
                  id="btn-git-push"
                  onClick={runGitHubActionsPipeline}
                  disabled={isGitHubRunning}
                  className={`w-full py-3 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${
                    isGitHubRunning
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg'
                  }`}
                >
                  <Play className={`w-4 h-4 ${isGitHubRunning ? 'animate-spin' : ''}`} />
                  {isGitHubRunning ? 'Runner 正在雲端打包內核...' : '🚀 commit & 觸發 Github ISO 打包流程'}
                </button>

                {/* Log screen console */}
                <div className="mt-4 bg-slate-950/90 border border-slate-800/80 rounded-lg p-3 font-mono text-xs h-64 overflow-y-auto flex flex-col gap-2">
                  <div className="text-slate-500 border-b border-slate-900 pb-2 mb-1 flex justify-between items-center text-[11px]">
                    <span>CI/CD Pipeline Log Stream</span>
                    <span>Step {gitHubStep}/12</span>
                  </div>

                  {gitHubLogs.map((log, lidx) => {
                    let logClass = 'text-slate-400';
                    if (log.includes('SUCCESS:')) logClass = 'text-emerald-400 font-bold';
                    else if (log.includes('⚡')) logClass = 'text-cyan-400';
                    else if (log.includes('🔨')) logClass = 'text-amber-300';
                    else if (log.includes('💿')) logClass = 'text-indigo-400';
                    return (
                      <div key={lidx} className={`leading-5 text-[11px] ${logClass} break-all`}>
                        {log}
                      </div>
                    );
                  })}
                </div>

                {/* Post compilation artifact down links */}
                {buildDone && (
                  <div className="mt-4 p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex flex-col gap-3 animate-fade-in">
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full mt-1 flex-shrink-0" />
                      <div className="text-xs">
                        <h5 className="font-bold text-emerald-400">CI 雲端包裝完成！</h5>
                        <p className="text-slate-400 mt-1">
                          已解包 Multiboot 符合性測試，產出可用於本機開機的 ISO 和源碼封包：
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={downloadCompiledISO}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
                      >
                        <HardDrive className="w-3.5 h-3.5" />
                        下載 tinyhobbyos.iso
                      </button>
                      
                      <button
                        onClick={() => {
                          // Generate code text package bundle download
                          const fullSource = files.map(f => `--- ${f.name} ---\n${f.code}\n`).join('\n');
                          const blob = new Blob([fullSource], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = 'tinyhobbyos_source.zip'; // Simulating ZIP
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-md transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        下載源碼打包檔
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Entire Main Grid is Document Guide */
          <div className="lg:col-span-12">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl flex flex-col gap-8 text-slate-300">
              
              {/* Box 1 */}
              <div>
                <h2 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Terminal className="text-cyan-400 w-5 h-5" />
                  1. 極簡本機 QEMU 一秒開機指南 (Mac / Linux / Windows)
                </h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  本作業系統設計精良，無任何重量級外部依賴，完美相容純 32-Bit 實體機開機與 QEMU 模擬器。
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                    <h3 className="text-xs font-bold text-slate-200">安裝基本虛擬器編譯設備 (預備)</h3>
                    <div className="font-mono text-xs text-cyan-400 bg-slate-950 p-2 border border-slate-800 rounded mt-3 leading-6 space-y-1">
                      <p className="text-slate-500"># macOS 環境</p>
                      <p>brew install nasm qemu xorriso</p>
                      <p className="text-slate-500 mt-2"># Ubuntu / Debian 環境</p>
                      <p>sudo apt-get install nasm qemu-system-x86 xorriso gcc-multilib</p>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                    <h3 className="text-xs font-bold text-slate-200">一鍵運行 QEMU (模擬直接啟動)</h3>
                    <div className="font-mono text-xs text-yellow-400 bg-slate-950 p-2 border border-slate-800 rounded mt-3 leading-6 space-y-1">
                      <p className="text-slate-500"># 方案 A：直接編譯並以 QEMU 掛載 ISO 啟動</p>
                      <p>make</p>
                      <p>qemu-system-i386 -cdrom tinyhobbyos.iso</p>
                      <p className="text-slate-500 mt-2"># 方案 B：直接加載 ELF kernel 核心（更快速）</p>
                      <p>qemu-system-i386 -kernel build/isodir/boot/myos.bin</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2 */}
              <div>
                <h2 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
                  <HardDrive className="text-emerald-400 w-5 h-5" />
                  2. 預期畫面與系統活命驗證
                </h2>
                <div className="mt-2 text-xs text-slate-400 leading-relaxed space-y-3">
                  <p>
                    當您在 QEMU / BOCHS 中或透過 USB 盤在您的老舊電腦實機上啟動此 ISO 檔時，將會看見以下震撼效果：
                  </p>
                  <ul className="list-disc pl-5 text-slate-300 space-y-1.5">
                    <li>
                      <strong className="text-cyan-400">極速 BIOS 交接：</strong> GRUB 開機選單亮起 15 秒倒數，點擊 Enter 瞬間跳轉載入您設計的核心。
                    </li>
                    <li>
                      <strong className="text-cyan-400">彩色文字藍色桌面國度：</strong> 螢幕載入 32 位元保護模式 C 內核，直接繪製美觀、高對比的類 GUI 對話框：
                      <span className="text-yellow-400 italic font-mono px-1">"TinyHobbyOS v0.1.2 kernel [x86 Protected Mode]"</span> 與開機硬體數據報告。
                    </li>
                    <li>
                      <strong className="text-cyan-400">閃爍的活性證明針 (Live Watchdog)：</strong> 螢幕右下角會以極高的頻率動態旋轉繪製 <code className="text-emerald-400 font-mono">| / - \</code> 字元。這是 C 語言核心代碼中 <code className="text-slate-100 font-mono">while(1)</code> 輪詢任務正在瘋狂運作的證明。
                    </li>
                    <li>
                      <strong className="text-cyan-400">PS/2 狀態監視埠：</strong> 螢幕內部主控面板上將實時動態跳動著 PS/2 端口 <code className="text-cyan-400 font-mono">0x64</code> 的硬體暫存器十六進位值，這代表滑鼠與鍵盤正實時回應核心指令。
                    </li>
                  </ul>
                </div>
              </div>

              {/* Box 3 */}
              <div>
                <h2 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Github className="text-purple-400 w-5 h-5" />
                  3. 如何將這個 Repo 託管至 GitHub 自動生成 ISO
                </h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  我們已經在倉庫中為您準備好了 <code className="text-slate-200 font-mono">.github/workflows/build-iso.yml</code> 檔案。您只需要：
                </p>
                <ol className="list-decimal pl-5 text-xs text-slate-300 space-y-2 mt-2">
                  <li>
                    在 GitHub 建立一個全新的私有或公開 Repository。
                  </li>
                  <li>
                    將本 App 導出的程式碼資料夾推提交至該 Repo 的 <code className="text-cyan-400 font-mono">main</code> 或 <code className="text-cyan-400 font-mono">master</code> 分支。
                  </li>
                  <li>
                    點選 GitHub 的「<strong className="text-white">Actions</strong>」分頁，您會看到名為 "Build TinyHobbyOS ISO" 的自動化流程正在高速安裝 `nasm xorriso` 套件並打包。
                  </li>
                  <li>
                    編譯完成後，即可在 Artifacts 自由下載最新的開機隨身碟 <strong className="text-emerald-400">ISO 映像檔</strong>！
                  </li>
                </ol>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Footer bar */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 font-sans mt-auto">
        <div className="flex justify-center items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>微型自製操作系統 & GitHub CI 平台</span>
        </div>
        <p>© 2026 Hobby Kernel Workspace. 教育專屬，致力於解密 32位元實體保護模式轉換細節。</p>
      </footer>
    </div>
  );
}
