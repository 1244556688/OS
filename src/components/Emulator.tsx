import React, { useEffect, useRef, useState, useMemo } from 'react';
import { BootState, RegisterState, ConsoleLog } from '../types';
import { Monitor, Power, Play, RefreshCw, AlertOctagon, Cpu, Info, FileCode } from 'lucide-react';

interface EmulatorProps {
  bootState: BootState;
  setBootState: (state: BootState) => void;
  compiledConfig: {
    bgColor: string;
    primaryColor: string;
    accentColor: string;
    title: string;
  };
  registerState: RegisterState;
  setRegisterState: React.Dispatch<React.SetStateAction<RegisterState>>;
  logs: ConsoleLog[];
  addLog: (text: string, type: 'info' | 'success' | 'warn' | 'error' | 'hardware') => void;
  clearLogs: () => void;
}

interface PaintPoint {
  x: number;
  y: number;
  color: string;
}

export default function Emulator({
  bootState,
  setBootState,
  compiledConfig,
  registerState,
  setRegisterState,
  logs,
  addLog,
  clearLogs,
}: EmulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 512, y: 384 });
  const [mouseClicked, setMouseClicked] = useState(false);
  const [paintPoints, setPaintPoints] = useState<PaintPoint[]>([]);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStepText, setBootStepText] = useState('');
  const [activeTab, setActiveTab] = useState<'gui' | 'registers' | 'gdt'>('gui');

  // Hardcoded PS/2 mouse offset boundary
  const PAINT_BOUNDS = { minX: 340, minY: 120, maxX: 980, maxY: 680 };

  // Handle Bootloader sequence triggers
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (bootState === 'BIOS') {
      setBootProgress(0);
      setBootStepText('正在啟動 BIOS (v4.0.12)...');
      addLog('PC 電源開啟，CPU 復位向量解譯中...', 'hardware');
      addLog('載入 BIOS 基本輸入輸出系統...', 'info');

      const steps = [
        { progress: 15, text: '核心暫存器測試：OK', log: '檢測到 80486 CPU 在 33 MHz、已啟用 GDT/IDT' },
        { progress: 35, text: '鍵盤與 PS/2 主機控制器自檢：OK', log: 'PS/2 雙向鏈接控制代碼：0x92 [Fast A20 啟用]' },
        { progress: 55, text: '檢索啟動硬體 (Floppy 磁碟 A:)', log: '在 0x7C00 位置載入 MBR 引導磁區...' },
        { progress: 75, text: '讀取啟動扇區 0x0..0x1FE (A: 引導程式)', log: '驗證 0xAA55 扇區簽章：正確' },
        { progress: 100, text: '引導權移交至核心...', log: '引導程序移交：JMP 0x0000:0x7C00' },
      ];

      let currentStepIdx = 0;
      const interval = setInterval(() => {
        if (currentStepIdx < steps.length) {
          const step = steps[currentStepIdx];
          setBootProgress(step.progress);
          setBootStepText(step.text);
          addLog(step.log as string, 'info');
          currentStepIdx++;
        } else {
          clearInterval(interval);
          setBootState('BOOTLOADER');
        }
      }, 700);

      return () => clearInterval(interval);
    } else if (bootState === 'BOOTLOADER') {
      addLog('進入 16-Bit 實模式引導程序...', 'info');
      addLog('正在發送 A20 總線致能信號 (Fast A20 Mode)...', 'success');
      
      timer = setTimeout(() => {
        addLog('開啟並載入全域描述符表 (Global Descriptor Table)...', 'info');
        setRegisterState((prev) => ({
          ...prev,
          CR0: '0x00000011 (保護模式開啟)',
          FLAGS: '0x00000202 (I/O 特權關閉)',
        }));
        
        setTimeout(() => {
          addLog('寫入 CR0 暫存器開啟 Protected Mode...', 'success');
          addLog('執行遠跳轉 (Far Jump 0x08:0x1000) 重新整理排程流水線...', 'info');
          setBootState('KERNEL_INIT');
        }, 800);
      }, 800);

      return () => clearTimeout(timer);
    } else if (bootState === 'KERNEL_INIT') {
      addLog('核心開始在 `0x100000` (1MB 記憶體邊界) 執行...', 'info');
      addLog('核心版本：v0.1.2 i386-elf-c', 'success');
      
      timer = setTimeout(() => {
        addLog('初始化中斷描述符表 (IDT)，註冊 ISR...', 'info');
        addLog('晶片集 8259 PIC (中斷控制器) 重定向配置...', 'info');
        addLog('啟用 PS/2 輔助鍵盤/滑鼠通告硬體端口 (0x60/0x64)...', 'success');
        addLog('PS/2 滑鼠驅動註冊完畢，等待鼠標反饋 [ACK: 0xFA]', 'hardware');
        
        setRegisterState((prev) => ({
          ...prev,
          ESP: '0x0008FFFF',
          EBP: '0x0008FFFF',
          EIP: '0x001004BC',
          CR3: '0x00002000 (分頁表格基底)',
        }));
        
        setTimeout(() => {
          addLog('核心圖形 VBE 位圖 1024x768x32bpp 配置成功', 'success');
          addLog('進入核心主畫框繪製事件循環...', 'info');
          setBootState('GUI');
        }, 1000);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [bootState]);

  // Canvas drawing routine for the Graphical VBE GUI Screen
  useEffect(() => {
    if (bootState !== 'GUI' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw screen
    const drawScreen = () => {
      ctx.clearRect(0, 0, 1024, 768);

      // 1. Draw Desktop background
      ctx.fillStyle = compiledConfig.bgColor;
      ctx.fillRect(0, 0, 1024, 768);

      // Grid background pattern for layout reference
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 1024; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 768);
        ctx.stroke();
      }
      for (let i = 0; i < 768; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(1024, i);
        ctx.stroke();
      }

      // 2. Head title bar (VESA Graphical Shell Theme)
      ctx.fillStyle = compiledConfig.primaryColor;
      ctx.fillRect(0, 0, 1024, 48);

      // Title bar buttons
      ctx.fillStyle = '#EF4444'; // Red exit
      ctx.beginPath(); ctx.arc(990, 24, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F59E0B'; // Yellow minimize
      ctx.beginPath(); ctx.arc(970, 24, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#10B981'; // Green maximize
      ctx.beginPath(); ctx.arc(950, 24, 6, 0, Math.PI * 2); ctx.fill();

      // Title Bar Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px "Space Grotesk", "Segoe UI", sans-serif';
      ctx.fillText(compiledConfig.title, 32, 29);

      // Sub-logo in the bar
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('VESA VBE 3.0', 840, 28);

      // 3. Draw Workspace Cards Windows
      // LEFT PART: CPU Status / Register Window Info Cards
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      // Round corner card
      ctx.roundRect?.(40, 80, 260, 640, 12);
      ctx.fill();
      ctx.shadowColor = 'transparent'; // resets

      // Card Header
      ctx.fillStyle = compiledConfig.primaryColor;
      ctx.fillRect(40, 80, 260, 40);
      // Mask round top corners for left card bar
      ctx.fillStyle = compiledConfig.primaryColor;
      ctx.beginPath();
      ctx.roundRect?.(40, 80, 260, 40, [12, 12, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('核心硬體暫存器規格', 56, 105);

      // Hardware Spec lines
      ctx.fillStyle = '#334155';
      ctx.font = '12px monospace';
      const specLines = [
        `GDT Base:   0x000F7A10`,
        `IDT Base:   0x000F8020`,
        `IRQ 0 (PIT): 18.2 Hz`,
        `IRQ 1 (KBD): 啟用`,
        `IRQ 12(MS):  啟用, 0x60`,
        `A20 Line:   已致能`,
        `FPU status: OK (x87)`,
        `Mouse (X):  ${mousePos.x}`,
        `Mouse (Y):  ${mousePos.y}`,
        `LBtn Click: ${mouseClicked ? '按下' : '放開'}`
      ];
      specLines.forEach((item, index) => {
        ctx.fillStyle = index > 6 ? '#0F766E' : '#334155';
        ctx.font = index > 6 ? 'bold 12px monospace' : '12px monospace';
        ctx.fillText(item, 56, 155 + index * 26);
      });

      // Quick help tips on bottom of left card
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(52, 430, 236, 230);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(52, 430, 236, 230);

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.fillText('💡 本機核心開發手冊：', 64, 455);
      
      ctx.font = '11px "Inter", sans-serif';
      const stepsText = [
        '1. 滑鼠移入右側網面區塊。',
        '2. 按住滑鼠左鍵可繪製。',
        '3. 透過左側代碼視窗，修改',
        '   [THEME_ACCENT] 的色碼。',
        '4. 點擊編譯並觀察滑鼠軌跡',
        '   跟著變成你的客製化配色！',
        '   這就是真實核心重構流程！'
      ];
      stepsText.forEach((st, sidx) => {
        ctx.fillText(st, 64, 485 + sidx * 21);
      });

      // RIGHT PART: Graphical Painter Window
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect?.(320, 80, 664, 640, 12);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Painter Header
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect?.(320, 80, 664, 40, [12, 12, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.fillText('PS/2 雙軸滑鼠實時繪圖測試面板 (VBE Framebuffer)', 340, 105);

      // Painter Canvas border
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(340, 140, 624, 520);
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(340, 140, 624, 520);

      // Canvas Label watermarks
      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 16px "Space Grotesk", sans-serif';
      ctx.fillText('VESA VIDEO FRAMEBUFFER ACTIVE', 510, 360);
      ctx.font = 'italic 12px monospace';
      ctx.fillText('Port 0x60 / 0x64 PS/2 ISR loop running @ IRQ 12', 515, 390);

      // 4. Draw user-painted tracks
      paintPoints.forEach((point) => {
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw mouse arrow pointer (VESA Native look)
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(mousePos.x, mousePos.y);
      ctx.lineTo(mousePos.x + 12, mousePos.y + 12);
      ctx.lineTo(mousePos.x + 4, mousePos.y + 14);
      ctx.lineTo(mousePos.x, mousePos.y + 20);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    };

    drawScreen();
  }, [bootState, mousePos, mouseClicked, paintPoints, compiledConfig]);

  // Handle local simulator canvas mouse events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (bootState !== 'GUI' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1024 / rect.width;
    const scaleY = 768 / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    setMousePos({ x, y });

    // Track state update for registers
    setRegisterState((prev) => ({
      ...prev,
      EAX: `0x0000${x.toString(16).toUpperCase().padStart(4, '0')}`,
      EBX: `0x0000${y.toString(16).toUpperCase().padStart(4, '0')}`,
      ECX: `0x0000000${mouseClicked ? '1' : '0'}`,
      EIP: '0x00100F8C (核心滑鼠動態迴圈輪詢)',
    }));

    // Paint if mouse button is clicked and inside bounds
    if (mouseClicked && x >= 340 && x <= 960 && y >= 140 && y <= 660) {
      setPaintPoints((prev) => [
        ...prev,
        {
          x,
          y,
          color: compiledConfig.accentColor,
        },
      ]);

      // Spark some hardware logs
      if (Math.random() < 0.25) {
        addLog(`[IRQ 12] PS/2滑鼠中斷: 放電封包 (${x}, ${y})`, 'hardware');
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (bootState !== 'GUI') return;
    setMouseClicked(true);
    // Log mouse click interrupt
    addLog('[IRQ 12] 滑鼠左鍵按壓：發送 PS/2 中斷封包 [0x09 0x00 0x00]', 'hardware');
  };

  const handleMouseUp = () => {
    if (bootState !== 'GUI') return;
    setMouseClicked(false);
    addLog('[IRQ 12] 滑鼠左鍵放開：發送 PS/2 中斷封包 [0x08 0x00 0x00]', 'hardware');
  };

  // Generate random interrupt mouse movement
  const triggerRandomMouseActivity = () => {
    if (bootState !== 'GUI') return;
    const randX = Math.floor(Math.random() * 400) + 400;
    const randY = Math.floor(Math.random() * 300) + 200;
    
    setMousePos({ x: randX, y: randY });
    addLog(`核心檢測到硬體定址：產生隨機主機中斷 (PS/2 偽訊號 X:${randX} Y:${randY})`, 'hardware');
  };

  return (
    <div id="emulator-root" className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Upper header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-cyan-400" />
          <span className="font-bold text-slate-200 text-sm font-sans tracking-wide">
            x86 物理虛擬機螢幕模擬器
          </span>
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
              bootState === 'GUI'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : bootState === 'POWER_OFF'
                ? 'bg-slate-800 text-slate-400'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {bootState}
          </span>
        </div>

        {/* Machine Action Buttons */}
        <div className="flex items-center gap-2">
          {bootState === 'POWER_OFF' ? (
            <button
              id="btn-power-on"
              onClick={() => setBootState('BIOS')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow active:scale-95 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              啟動電源 (Boot VM)
            </button>
          ) : (
            <>
              <button
                id="btn-reboot"
                onClick={() => {
                  setBootState('BIOS');
                  setPaintPoints([]);
                }}
                className="flex items-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-800"
                title="軟體覆位冷啟動"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重啟
              </button>
              <button
                id="btn-crash-os"
                onClick={() => {
                  setBootState('PANIC');
                  addLog('*** CRITICAL: 硬體觸發異常 0x0D GPE (General Protection Fault) ***', 'error');
                  addLog('核心已崩潰，重寫核心分頁失敗。鍵盤滑鼠連線終結！', 'error');
                }}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors text-xs font-semibold py-1.5 px-3 rounded-lg border border-rose-900/50"
                title="模擬 General Protection Fault 藍屏崩潰"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                觸發核心崩溃 💥
              </button>
            </>
          )}
        </div>
      </div>

      {/* Screen Frame Container */}
      <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center relative min-h-[460px] overflow-hidden">
        {bootState === 'POWER_OFF' && (
          <div className="flex flex-col items-center gap-4 text-center z-10 py-16">
            <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center shadow-inner cursor-pointer hover:border-cyan-500 hover:shadow-cyan-500/20 transition-all duration-300 group" onClick={() => setBootState('BIOS')}>
              <Power className="w-10 h-10 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-slate-300 font-bold text-sm tracking-widest">作業系統未開啟</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                欲在沙盒內測試引導並查看 VBE 顯示器和 PS/2 滑鼠，請點擊上方或周中的電源鈕。
              </p>
            </div>
          </div>
        )}

        {bootState === 'BIOS' && (
          <div className="w-full max-w-xl bg-black border border-slate-800 rounded-lg p-6 font-mono text-xs text-slate-300 h-96 flex flex-col justify-between shadow-2xl relative">
            <div>
              <div className="flex justify-between border-b border-slate-800 pb-2 mb-4 text-slate-500">
                <span>SEABIOS COREBOOT v1.12</span>
                <span>VM ID: #A12B</span>
              </div>
              <div className="space-y-2">
                <p className="text-cyan-400 font-bold">Phoenix BIOS Loader (x86_16)</p>
                <div className="flex items-center justify-between">
                  <span>RAM test: 65,536 KB BASE MEMORY</span>
                  <span className="text-emerald-500">OK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>CPU: Intel 486 DX @ 33MHz</span>
                  <span className="text-emerald-500">OK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>LBA IDE DMA Disk Driver</span>
                  <span className="text-emerald-500">Initialized</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Loading: Master Boot Record sector 1</span>
                  <span className="text-yellow-500 animate-pulse">READING...</span>
                </div>
              </div>
            </div>
            
            {/* Booting Progress */}
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 flex items-center justify-between leading-none mb-1">
                <span>{bootStepText}</span>
                <span>{bootProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${bootProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {bootState === 'BOOTLOADER' && (
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-lg p-6 font-mono text-xs text-slate-300 h-96 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between border-b border-slate-800 pb-1 mb-3 text-slate-500">
                <span>16-Bit Real Mode Bootstrap (0x7C00)</span>
                <span className="text-cyan-400 animate-pulse">EXEC_STAGE</span>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-emerald-400">boot.asm</span> 被 BIOS 放置於 0x7C00 位址。執行引導自檢代碼：
                  <div className="mt-2 bg-slate-900 p-2 border border-slate-800 rounded text-slate-300 leading-relaxed font-mono">
                    <span className="text-indigo-400">lgdt</span> [gdt_descriptor] <span className="text-slate-500">; 載入全域描述表</span><br />
                    <span className="text-indigo-400">mov</span> eax, cr0 <span className="text-indigo-400 font-bold">|</span> <span className="text-indigo-400">or</span> eax, 1 <span className="text-slate-500">; 開啟保護模式位</span><br />
                    <span className="text-indigo-400">jmp</span> CODE_SEG:init_pm <span className="text-slate-500">; 遠跳轉進32位模式，清除流水線!</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="animate-ping inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-amber-400">正在解除 20號定位線(A20 Gate)，進行段重組定址...</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500">CR0 Register Value = 0x60000010 (Real Mode)</div>
          </div>
        )}

        {bootState === 'KERNEL_INIT' && (
          <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-lg p-6 font-mono text-xs text-slate-300 h-96 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between border-b border-slate-800 pb-1 mb-3 text-slate-500">
                <span>32-Bit Core Kernel Initialization (0x1000)00</span>
                <span className="text-yellow-400 animate-pulse">INIT_STAGE</span>
              </div>
              <div className="space-y-3">
                <p className="text-slate-400">成功解譯跳轉位：已經入 32位元保護模式。</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">1. 初始化 GDT 與 IDT 中斷向量</span>
                    <span className="text-emerald-500">✔ Done</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">2. 重定向 Programmable Interrupt Controller (8259)</span>
                    <span className="text-emerald-500">✔ Done</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">3. 初始化 PS2 補助設備滑鼠排程</span>
                    <span className="text-cyan-400 animate-pulse">⚡ Activating (Port 0x64/0x60)</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">4. 建立 VBE 幀緩存顯示結構</span>
                    <span className="text-emerald-500">✔ 1024x768x32bpp Framebuffer OK</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500">EIP register jumped to _entry point at 0x100000</div>
          </div>
        )}

        {bootState === 'GUI' && (
          <div className="w-full relative flex justify-center items-center">
            {/* VBE Screen Canvas with scanline effect */}
            <div className="relative border-4 border-slate-700 rounded-xl overflow-hidden shadow-2xl bg-zinc-900 max-w-full aspect-[4/3] w-[860px]">
              <canvas
                id="kernel_vbe_screen"
                ref={canvasRef}
                width={1024}
                height={768}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-auto cursor-none select-none"
              />
              {/* Optional CRT Scanline effect overlaid */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[rgba(18,24,38,0.01)] to-transparent bg-[size:100%_4px]" />
            </div>
          </div>
        )}

        {bootState === 'PANIC' && (
          <div className="w-full max-w-2xl bg-blue-700 border border-blue-600 rounded-lg p-8 font-mono text-xs text-white h-96 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="bg-white text-blue-700 font-bold px-3 py-1 inline-block rounded text-sm">
                !!! KERNEL PANIC !!!
              </div>
              <p className="text-sm font-bold leading-relaxed">
                A critical exception occurred and TinyHobbyOS has been halted to prevent damage to host memory.
              </p>
              <div className="bg-blue-800 p-4 rounded border border-blue-600 text-cyan-200 leading-relaxed font-mono space-y-1.5">
                <p className="text-white font-bold">Exception: 0x0D (General Protection Fault)</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
                  <span>EAX: {registerState.EAX}</span>
                  <span>EBX: {registerState.EBX}</span>
                  <span>ECX: {registerState.ECX}</span>
                  <span>EDX: {registerState.EDX}</span>
                  <span>ESP: {registerState.ESP}</span>
                  <span>EBP: {registerState.EBP}</span>
                  <span>EIP: 0x0010F20C (GPF Trigger Address)</span>
                  <span>CR0: {registerState.CR0}</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-blue-500 pt-3 flex justify-between items-center text-[11px] text-zinc-300">
              <p>點擊右側按鈕進行冷重置還原安全執行段：</p>
              <button
                id="btn-panic-recovery"
                onClick={() => {
                  setBootState('BIOS');
                  setPaintPoints([]);
                  addLog('從核心藍屏中手動重啟。狀態已全新重置。', 'success');
                }}
                className="bg-white text-blue-700 hover:bg-slate-100 font-bold px-4 py-2 rounded shadow transition-all active:scale-95"
              >
                冷開機 & 重設核心
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Registers Inspector & Interactive helpers at bottom of Emulator panel */}
      {bootState === 'GUI' && (
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex justify-between items-center text-xs">
          <div className="flex gap-4">
            <span className="font-mono text-slate-500">
              EAX (X位移): <strong className="text-cyan-400 font-bold">{registerState.EAX}</strong>
            </span>
            <span className="font-mono text-slate-500">
              EBX (Y位移): <strong className="text-cyan-400 font-bold">{registerState.EBX}</strong>
            </span>
            <span className="font-mono text-slate-500">
              ECX (鍵): <strong className="text-cyan-400 font-bold">{registerState.ECX}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="btn-ps2-irq"
              onClick={triggerRandomMouseActivity}
              className="text-[11px] font-sans text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/60 border border-cyan-800/40 rounded-lg px-2.5 py-1 flex items-center gap-1 transition-colors"
              title="對 0x60 硬體緩衝區強行打入隨機滑鼠中斷訊號"
            >
              傳送硬體 PS/2 滑鼠驅動中斷 🖱️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
