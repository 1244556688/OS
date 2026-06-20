; =================================================================
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
