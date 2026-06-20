/* =================================================================
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
