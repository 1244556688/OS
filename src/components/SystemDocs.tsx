import { Cpu, Terminal, BookOpen, HardDrive } from 'lucide-react';

export default function SystemDocs() {
  return (
    <div id="system-docs-root" className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl h-full flex flex-col justify-between text-slate-300">
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100 font-sans">
            微型作業系統架構與開發手冊 (Technical Docs)
          </h2>
        </div>

        {/* Section 1 */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-sans">
            <Cpu className="w-4 h-4 text-emerald-400" />
            1. x86 五大開機引導階段
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            本系統模擬了標準相容 IBM PC 的經典 32-Bit 實地址/保護模式轉置流程：
          </p>
          <ul className="text-xs space-y-2 text-slate-300 pl-4 list-disc font-sans">
            <li>
              <strong className="text-cyan-400">BIOS 階段：</strong> 主板上電，CPU 自節跳轉至 0xFFFF0（暫存器 CS=FFFFh, IP=0000h），加載並執行 BIOS Self-Test (POST)，隨後搜尋硬磁碟第零磁區（僅 512 字節的 MBR），確認尾碼為 <code className="bg-slate-950 font-mono text-cyan-400 px-1 py-0.5 rounded">0xAA55</code> 即將之載入記憶體基地位址 <code className="bg-slate-950 font-mono text-cyan-400 px-1 py-0.5 rounded">0x7C00</code>。
            </li>
            <li>
              <li>
                <strong className="text-cyan-400">16位元引導程式 (boot.asm)：</strong> 引導開始運行。因為此時處於
                <strong className="text-amber-400">實模式 (Real Mode)</strong>，只能尋址至 1MB 内。這段引導負責啟用 
                <strong className="text-emerald-400">Fast A20 Gate</strong> 來解鎖更多定址匯流排、構造 GDT（全域描述表）、然後將作業系統內核讀入記憶體定址 <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-400">0x1000</code> 處。
              </li>
            </li>
            <li>
              <strong className="text-cyan-400">保護模式轉換：</strong> 引導程式藉由改裝系統控制暫存器
              <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-400">CR0</code> 的第 0 位（PE，Protect Enable 位）設為 1，藉此一躍將 CPU 從 16-Bit 開啟至 32-Bit 的 <strong className="text-cyan-400">保護模式 (Protected Mode)</strong>，定址空間瞬間擴增至 4GB，並利用遠跳轉（Far Jump）更新 CS 代碼段暫存器，確保指令流水線乾淨。
            </li>
            <li>
              <strong className="text-cyan-400">C 核心裝載執行 (kernel.c)：</strong> 進入 32 位元純平坦記憶體模型（Flat Memory Model）後，CS, DS 等段基址全部定位在 0 刻度。核心開始調度硬件端口、註冊 IDT 中斷向量表、激活 PS/2 滑鼠，並初始化 VESA VBE 的 32 位彩色幀緩衝區。
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-sans">
            <Terminal className="w-4 h-4 text-cyan-400" />
            2. 滑鼠 PS/2 驅動解析協定
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            滑鼠是以每 3 個位元組為一個封包發送資料到鍵盤控制器數據端口 <code className="bg-slate-950 px-1 py-0.5 rounded font-mono text-cyan-400 font-bold">0x60</code>：
          </p>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-400 overflow-x-auto leading-relaxed">
            Byte 0: [ Y_over ] [ X_over ] [ Y_sign ] [ X_sign ] [ 1 ] [ M_Btn ] [ R_Btn ] [ L_Btn ]<br />
            Byte 1: [ X 軸相對位移量大小 (X_movement) ]<br />
            Byte 2: [ Y 軸相對位移量大小 (Y_movement) ]
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">
            本系統模擬了中斷服務例行程序 (ISR) 面對 IRQ 12 時的完整流程，讀入位移字節後，對 Y 軸正負號溢位位址進行補數修正，更新位於幀緩衝區中滑鼠指針圖層的位置，檢測左鍵（Bit 0）是否按下以決定是否於 VBE 面板進行畫筆塗鴉。
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-sans">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            3. 現場實機編譯與 QEMU 虛擬機啟動指南
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            如果想要在自己的電腦本機（Mac/Linux/Windows）上編譯本核心，可以使用如下真實指令：
          </p>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 leading-6 space-y-1">
            <p className="text-slate-500"># 1. 使用 nasm 平鋪編譯引導扇區（編譯成 512B 纯二進位二進位）</p>
            <p><span className="text-cyan-400">nasm</span> -f bin boot.asm -o boot.bin</p>
            <p className="text-slate-500"># 2. 編譯 C 核心（關閉 libc 等依賴以符合 Freestanding 核心規範）</p>
            <p><span className="text-cyan-400">i686-elf-gcc</span> -m32 -ffreestanding -O2 -c kernel.c -o kernel.o</p>
            <p className="text-slate-500"># 3. 遵照連結描述分配，將二進位拼接並對齊</p>
            <p><span className="text-cyan-400">i686-elf-ld</span> -T linker.ld -o kernel.elf boot.bin kernel.o</p>
            <p><span className="text-cyan-400">objcopy</span> -O binary kernel.elf os-image.img</p>
            <p className="text-slate-500"># 4. 在 QEMU x86 模擬器中直接掛載引導運行！</p>
            <p><span className="text-emerald-400 font-bold">qemu-system-i386</span> -fda os-image.img</p>
          </div>
        </section>
      </div>

      <div className="mt-6 border-t border-slate-800 pt-4 flex justify-between items-center text-xs text-slate-500 font-sans">
        <span>TinyHobbyOS 模擬器 v0.1.2 發行版</span>
        <span className="text-cyan-500 bg-cyan-950/20 border border-cyan-800/20 px-2 py-0.5 rounded font-mono">1.44MB Flp Disk</span>
      </div>
    </div>
  );
}
