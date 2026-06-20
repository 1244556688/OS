/* =================================================================
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
