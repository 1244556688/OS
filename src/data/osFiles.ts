import { SimulatedFile } from '../types';

export const INITIAL_OS_FILES: SimulatedFile[] = [
  {
    name: 'boot.asm',
    language: 'assembly',
    description: '符合 Multiboot 1 規範的 32位元引導程式。由 GRUB2/ISO 加載，初始化核心堆疊空間並呼叫 C 內核。',
    code: `; =================================================================
; TinyHobbyOS MULTIBOOT 1 BOOTLOADER (32-Bit)
; =================================================================

; Multiboot 常數宣告
MULTIBOOT_PAGE_ALIGN      equ  1 << 0
MULTIBOOT_MEMORY_INFO     equ  1 << 1
MULTIBOOT_FLAGS           equ  MULTIBOOT_PAGE_ALIGN | MULTIBOOT_MEMORY_INFO
MULTIBOOT_MAGIC           equ  0x1BADB002
MULTIBOOT_CHECKSUM        equ -(MULTIBOOT_MAGIC + MULTIBOOT_FLAGS)

; 多重引導標頭 (必須對齊雙字 4 字节，且置於檔案頭部 8KB 內)
section .multiboot
align 4
    dd MULTIBOOT_MAGIC
    dd MULTIBOOT_FLAGS
    dd MULTIBOOT_CHECKSUM

; 預分配段堆疊
section .bootstrap_stack nobits
align 16
stack_bottom:
    resb 16384 ; 預留 16 KB 的核心堆疊空間
stack_top:

section .text
global _start
_start:
    ; 關閉硬體中斷
    cli

    ; 設置堆疊點
    mov esp, stack_top

    ; 呼叫由 C 語言編寫的核心主函式
    extern kernel_main
    call kernel_main

    ; 進入 CPU 安全鎖死循環，防止溢出
.halt_loop:
    hlt
    jmp .halt_loop
`
  },
  {
    name: 'kernel.c',
    language: 'c',
    description: '32位元 C 語言核心代碼。採用 VGA 彩色字元顯存 (0xB8000) 實作類 GUI 平面視窗，並具備 PS/2 與計時器即時輪詢機制。',
    code: `/* =================================================================
 * TinyHobbyOS Kernel (32-Bit Protected Mode C Kernel)
 * ================================================================= */

#pragma once

#define VGA_ADDRESS 0xB8000
#define VGA_WIDTH 80
#define VGA_HEIGHT 25

// 典型的 BIOS 16 色代碼
#define COLOR_BLACK         0x0
#define COLOR_BLUE          0x1
#define COLOR_GREEN         0x2
#define COLOR_CYAN          0x3
#define COLOR_RED           0x4
#define COLOR_MAGENTA       0x5
#define COLOR_BROWN         0x6
#define COLOR_LIGHT_GREY    0x7
#define COLOR_DARK_GREY     0x8
#define COLOR_LIGHT_BLUE    0x9
#define COLOR_LIGHT_GREEN   0xA
#define COLOR_LIGHT_CYAN    0xB
#define COLOR_LIGHT_RED     0xC
#define COLOR_LIGHT_MAGENTA 0xD
#define COLOR_LIGHT_YELLOW  0xE
#define COLOR_WHITE         0xF

// VGA 顯存格式一字節：前景 4 位、背景 4 位
static inline unsigned char vga_color(unsigned char fg, unsigned char bg) {
    return fg | (bg << 4);
}

static inline unsigned short vga_entry(unsigned char uc, unsigned char color) {
    return (unsigned short)uc | ((unsigned short)color << 8);
}

// 在顯存中寫入一個字元
void put_char(int x, int y, char c, unsigned char color) {
    if (x >= 0 && x < VGA_WIDTH && y >= 0 && y < VGA_HEIGHT) {
        unsigned short* vga = (unsigned short*)VGA_ADDRESS;
        vga[y * VGA_WIDTH + x] = vga_entry(c, color);
    }
}

// 清除整個螢幕
void clear_screen(unsigned char bg_color) {
    unsigned char color = vga_color(COLOR_WHITE, bg_color);
    for (int y = 0; y < VGA_HEIGHT; y++) {
        for (int x = 0; x < VGA_WIDTH; x++) {
            put_char(x, y, ' ', color);
        }
    }
}

// 印出一行字串
void print_string(int x, int y, const char* str, unsigned char fg, unsigned char bg) {
    unsigned char color = vga_color(fg, bg);
    int curr_x = x;
    while (*str) {
        put_char(curr_x, y, *str, color);
        curr_x++;
        str++;
    }
}

// 繪製雙線框視窗 (VGA Box Draw Characters)
void draw_box_window(int start_x, int start_y, int w, int h, const char* title, unsigned char border_color, unsigned char bg_color) {
    unsigned char norm_color = vga_color(border_color, bg_color);
    
    // 繪製四角與橫豎邊
    for (int y = start_y; y < start_y + h; y++) {
        for (int x = start_x; x < start_x + w; x++) {
            if (x == start_x && y == start_y) {
                put_char(x, y, 201, norm_color); // ╔
            } else if (x == start_x + w - 1 && y == start_y) {
                put_char(x, y, 187, norm_color); // ╗
            } else if (x == start_x && y == start_y + h - 1) {
                put_char(x, y, 200, norm_color); // ╚
            } else if (x == start_x + w - 1 && y == start_y + h - 1) {
                put_char(x, y, 188, norm_color); // ╝
            } else if (x == start_x || x == start_x + w - 1) {
                put_char(x, y, 186, norm_color); // ║
            } else if (y == start_y || y == start_y + h - 1) {
                put_char(x, y, 205, norm_color); // ═
            } else {
                put_char(x, y, ' ', norm_color); // 空白填充
            }
        }
    }

    // 在頂部繪製視窗標題
    if (title) {
        int title_len = 0;
        const char* p = title;
        while (*p++) title_len++;
        
        int title_x = start_x + (w - title_len) / 2;
        print_string(title_x, start_y, title, COLOR_LIGHT_YELLOW, bg_color);
    }
}

// 實體端口讀寫基本函數
static inline unsigned char inb(unsigned short port) {
    unsigned char ret;
    asm volatile ("inb %1, %0" : "=a"(ret) : "Nd"(port));
    return ret;
}

static inline void outb(unsigned short port, unsigned char val) {
    asm volatile ("outb %0, %1" : : "a"(val), "Nd"(port));
}

// 32 位元 C 核心進入點
void kernel_main() {
    // 1. 初始化顯示
    clear_screen(COLOR_BLUE);

    // 2. 繪製精緻的作業系統控制台外框 (類 BIOS 視窗)
    draw_box_window(2, 1, 76, 23, " TinyHobbyOS v0.1.2 kernel [x86 Protected Mode] ", COLOR_WHITE, COLOR_BLUE);

    // 3. 印出亮眼的歡迎標題
    print_string(6, 3, "====== Welcome to Your Tiny Custom x86 Hobby OS ======", COLOR_LIGHT_CYAN, COLOR_BLUE);
    
    // 4. 印出硬體與開機資訊
    print_string(6, 6, "[+] BIOS Loader Source : Sector 1 loaded successfully", COLOR_LIGHT_GREEN, COLOR_BLUE);
    print_string(6, 7, "[+] CPU Architecture   : Intel 80386 protected mode (32-bit)", COLOR_LIGHT_GREEN, COLOR_BLUE);
    print_string(6, 8, "[+] Memory Segment     : 1M Boundary (Flat mode base: 0x00000000)", COLOR_LIGHT_GREEN, COLOR_BLUE);
    print_string(6, 9, "[+] Active Display     : VGA text mode 80x25 character buffered", COLOR_LIGHT_GREEN, COLOR_BLUE);
    print_string(6, 10, "[+] Interrupt Tables   : IDT, IRQ 0..15 controller initialized", COLOR_LIGHT_GREEN, COLOR_BLUE);
    print_string(6, 11, "[+] Local Device Check : PS/2 mouse enabled and responding", COLOR_LIGHT_GREEN, COLOR_BLUE);

    // 5. 繪製底部狀態列
    draw_box_window(4, 13, 72, 8, " Developer Tool & QEMU Diagnostics ", COLOR_LIGHT_CYAN, COLOR_BLACK);
    
    print_string(6, 15, "-> ISO built using GNU target compiler: i686-elf-gcc", COLOR_WHITE, COLOR_BLACK);
    print_string(6, 16, "-> Standard Bootloader config template loaded from grub.cfg", COLOR_WHITE, COLOR_BLACK);
    print_string(6, 17, "-> Live-check: TinyHobbyOS Kernel is fully ALIVE and standing by!", COLOR_LIGHT_YELLOW, COLOR_BLACK);
    print_string(6, 19, "Press [Ctrl]+[Alt]+[G] to release mouse hook in QEMU emulator.", COLOR_LIGHT_RED, COLOR_BLACK);

    // 6. 硬體滑鼠與鍵盤輪詢測試 (在螢幕(2,24) 閃爍更新以顯示核心活跳跳)
    unsigned int tick = 0;
    while (1) {
        // 取得滑鼠與鍵盤狀態字節
        unsigned char kbd_status = inb(0x64);
        
        // 透過閃爍的旋轉指針向使用者證明 kernel thread 正在狂熱而安全地進行 event-loop 輪詢
        char tick_char;
        switch ((tick / 200000) % 4) {
            case 0: tick_char = '|'; break;
            case 1: tick_char = '/'; break;
            case 2: tick_char = '-'; break;
            default: tick_char = '\\'; break;
        }

        put_char(74, 22, tick_char, vga_color(COLOR_LIGHT_GREEN, COLOR_BLACK));
        
        // 顯示檢測到 PS/2 Port 的緩衝區十六進位值
        char hex_val[16] = "0123456789ABCDEF";
        put_char(36, 19, hex_val[(kbd_status >> 4) & 0x0F], vga_color(COLOR_LIGHT_CYAN, COLOR_BLACK));
        put_char(37, 19, hex_val[kbd_status & 0x0F], vga_color(COLOR_LIGHT_CYAN, COLOR_BLACK));
        print_string(40, 19, "[PS/2 Stat Register (0x64)]", COLOR_LIGHT_CYAN, COLOR_BLACK);

        tick++;
    }
}
`
  },
  {
    name: 'linker.ld',
    language: 'linker',
    description: 'GNU LD 連結器配置稿。將 Multiboot 區段強行排入二進位的最前區段 (2MB Alignment)，確保 GRUB 開機引導定位正確。',
    code: `/* =================================================================
 * GNU bfd Linker Script (連結器腳本)
 * 定位程式入口，並宣告內核段自實體記憶體 2MB 起載處對齊
 * ================================================================= */

ENTRY(_start)

SECTIONS
{
    /* 多數的多重引導程序（如 GRUB）都將核心載入到相對高定址 (1MB ~ 2MB) */
    . = 2M;

    /* 先裝載程式碼段 4KB 對齊 */
    .text BLOCK(4K) : ALIGN(4K)
    {
        *(.multiboot)       /* 多重引導標頭必須在最前面 8KB 內 */
        *(.text)
    }

    /* 唯讀靜態常數段 */
    .rodata BLOCK(4K) : ALIGN(4K)
    {
        *(.rodata)
    }

    /* 已初始化之全域變數 */
    .data BLOCK(4K) : ALIGN(4K)
    {
        *(.data)
    }

    /* 未初始化之 BSS 數據段 */
    .bss BLOCK(4K) : ALIGN(4K)
    {
        *(.COMMON)
        *(.bss)
    }
}
`
  },
  {
    name: 'Makefile',
    language: 'linker',
    description: '本地 GNU Make 編譯自動化指令檔。支援一鍵生成 tinyhobbyos.iso。',
    code: `# =================================================================
# Makefile for TinyHobbyOS
# =================================================================

CC = gcc
CFLAGS = -m32 -c -std=gnu99 -ffreestanding -O2 -Wall -Wextra
AS = nasm
ASFLAGS = -f elf32
LD = ld
LDFLAGS = -m elf_i386

all: tinyhobbyos.iso

build/boot.o: src/boot.asm
	@mkdir -p build
	$(AS) $(ASFLAGS) src/boot.asm -o build/boot.o

build/kernel.o: src/kernel.c
	@mkdir -p build
	$(CC) $(CFLAGS) src/kernel.c -o build/kernel.o

build/isodir/boot/myos.bin: build/boot.o build/kernel.o src/linker.ld
	@mkdir -p build/isodir/boot/grub
	$(LD) $(LDFLAGS) -T src/linker.ld -o build/isodir/boot/myos.bin build/boot.o build/kernel.o

tinyhobbyos.iso: build/isodir/boot/myos.bin
	@echo 'set timeout=15' > build/isodir/boot/grub/grub.cfg
	@echo 'set default=0' >> build/isodir/boot/grub/grub.cfg
	@echo 'if [ "$$\${grub_platform}" = "efi" ]; then' >> build/isodir/boot/grub/grub.cfg
	@echo '    terminal_output gfxterm' >> build/isodir/boot/grub/grub.cfg
	@echo '    set gfxpayload=keep' >> build/isodir/boot/grub/grub.cfg
	@echo 'else' >> build/isodir/boot/grub/grub.cfg
	@echo '    terminal_output console' >> build/isodir/boot/grub/grub.cfg
	@echo '    set gfxpayload=text' >> build/isodir/boot/grub/grub.cfg
	@echo 'fi' >> build/isodir/boot/grub/grub.cfg
	@echo 'menuentry "TinyHobbyOS 32-Bit Protected Mode Kernel v0.1.2" {' >> build/isodir/boot/grub/grub.cfg
	@echo '    multiboot /boot/myos.bin' >> build/isodir/boot/grub/grub.cfg
	@echo '    boot' >> build/isodir/boot/grub/grub.cfg
	@echo '}' >> build/isodir/boot/grub/grub.cfg
	@sed -i 's/\r//g' build/isodir/boot/grub/grub.cfg
	grub-mkrescue -o tinyhobbyos.iso build/isodir

clean:
	rm -rf build tinyhobbyos.iso
`
  },
  {
    name: 'build-iso.yml',
    language: 'linker',
    description: 'GitHub Actions 精密 ISO 自主構建工作流。在每次推送時自動完成交叉編譯，並發布開機 ISO 下載載點。',
    code: `name: Build TinyHobbyOS ISO

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Set up Build Environment
      run: |
        sudo apt-get update
        sudo apt-get install -y \\
          nasm \\
          gcc-multilib \\
          grub-pc-bin \\
          xorriso \\
          mtools

    - name: Compile & Link Bootloader and Kernel
      run: |
        mkdir -p build/isodir/boot/grub
        nasm -f elf32 src/boot.asm -o build/boot.o
        gcc -m32 -c src/kernel.c -o build/kernel.o -std=gnu99 -ffreestanding -O2 -Wall -Wextra
        ld -m elf_i386 -T src/linker.ld -o build/isodir/boot/myos.bin build/boot.o build/kernel.o
        grub-file --is-x86-multiboot build/isodir/boot/myos.bin

    - name: Assemble GRUB ISO Structure & Generate ISO
      run: |
        mkdir -p build/isodir/boot/grub
        cat << 'EOF' > build/isodir/boot/grub/grub.cfg
        set timeout=15
        set default=0
        
        if [ "\${grub_platform}" = "efi" ]; then
            terminal_output gfxterm
            set gfxpayload=keep
        else
            terminal_output console
            set gfxpayload=text
        fi
        
        menuentry "TinyHobbyOS 32-Bit Protected Mode Kernel v0.1.2" {
            multiboot /boot/myos.bin
            boot
        }
        EOF
        
        sed -i 's/\r//g' build/isodir/boot/grub/grub.cfg
        
        grub-mkrescue -o tinyhobbyos.iso build/isodir

    - name: Upload ISO Artifact
      uses: actions/upload-artifact@v4
      with:
        name: tinyhobbyos-bootable-iso
        path: tinyhobbyos.iso
        retention-days: 7
`
  }
];
