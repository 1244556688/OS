export interface SimulatedFile {
  name: string;
  language: 'assembly' | 'c' | 'linker';
  code: string;
  description: string;
}

export interface RegisterState {
  EAX: string;
  EBX: string;
  ECX: string;
  EDX: string;
  ESP: string;
  EBP: string;
  EIP: string;
  CR0: string; // Used to show protected mode bit
  CR3: string; // Used to show paging
  FLAGS: string;
}

export type BootState =
  | 'POWER_OFF'
  | 'BIOS'
  | 'BOOTLOADER'
  | 'KERNEL_INIT'
  | 'GUI'
  | 'PANIC';

export interface ConsoleLog {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'hardware';
}
