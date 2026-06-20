# =================================================================
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
	@echo 'terminal_output console' >> build/isodir/boot/grub/grub.cfg
	@echo 'set gfxpayload=text' >> build/isodir/boot/grub/grub.cfg
	@echo 'menuentry "TinyHobbyOS 32-Bit Protected Mode Kernel v0.1.2" {' >> build/isodir/boot/grub/grub.cfg
	@echo '    multiboot /boot/myos.bin' >> build/isodir/boot/grub/grub.cfg
	@echo '    boot' >> build/isodir/boot/grub/grub.cfg
	@echo '}' >> build/isodir/boot/grub/grub.cfg
	@sed -i 's/\r//g' build/isodir/boot/grub/grub.cfg
	grub-mkrescue -o tinyhobbyos.iso build/isodir

clean:
	rm -rf build tinyhobbyos.iso
