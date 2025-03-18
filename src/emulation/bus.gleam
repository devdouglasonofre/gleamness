import emulation/types.{type Bus, Bus}
import gleam/int
import gleam/io
import gleam/option.{None, Some}
import gleam/result
import iv

// Memory map constants
pub const ram_start = 0x0000

pub const ram_mirrors_end = 0x1FFF

pub const ppu_registers = 0x2000

pub const ppu_registers_mirrors_end = 0x3FFF

pub const prg_rom_start = 0x8000

pub const prg_rom_end = 0xFFFF

// 32 KB
pub const prg_rom_size = 0x8000

// Create a new bus with a ROM
pub fn new_with_rom(rom: types.Rom) -> Bus {
  Bus(cpu_vram: iv.repeat(0, 0x2000), rom: Some(rom))
}

// Read a byte from the bus
pub fn mem_read(bus: Bus, addr: Int) -> Result(Int, Nil) {
  case addr {
    addr if addr >= ram_start && addr <= ram_mirrors_end -> {
      // Mirror down RAM address
      let mirror_down_addr = int.bitwise_and(addr, 0b0000011111111111)
      iv.get(bus.cpu_vram, mirror_down_addr)
      |> result.replace_error(Nil)
    }

    addr if addr >= ppu_registers && addr <= ppu_registers_mirrors_end -> {
      // Mirror down PPU registers
      let _mirror_down_addr = int.bitwise_and(addr, 0b0010000000000111)
      // PPU not implemented yet
      Ok(0)
    }

    addr if addr >= prg_rom_start && addr <= prg_rom_end -> {
      // Access cartridge ROM space
      read_prg_rom(bus, addr)
    }

    _ -> {
      // Ignore mem access at other addresses
      Ok(0)
    }
  }
}

// Write a byte to the bus
pub fn mem_write(bus: Bus, addr: Int, data: Int) -> Result(Bus, Nil) {
  case addr {
    addr if addr >= ram_start && addr <= ram_mirrors_end -> {
      // Mirror down RAM address
      // iv.set returns a new array with the updated value
      let mirror_down_addr = int.bitwise_and(addr, 0b0000011111111111)
      let assert Ok(new_vram) = iv.set(bus.cpu_vram, mirror_down_addr, data)
      Ok(Bus(..bus, cpu_vram: new_vram))
    }

    addr if addr >= ppu_registers && addr <= ppu_registers_mirrors_end -> {
      // Mirror down PPU registers
      let _mirror_down_addr = int.bitwise_and(addr, 0b0010000000000111)
      // PPU not implemented yet
      Ok(bus)
    }

    addr if addr >= prg_rom_start && addr <= prg_rom_end -> {
      // Cannot write to cartridge ROM
      Error(Nil)
    }

    _ -> {
      // Ignore mem write-access at other addresses
      Ok(bus)
    }
  }
}

// Read a 16-bit value from the bus (little-endian)
pub fn mem_read_u16(bus: Bus, addr: Int) -> Result(Int, Nil) {
  case mem_read(bus, addr) {
    Ok(lo) -> {
      case mem_read(bus, addr + 1) {
        Ok(hi) -> Ok(int.bitwise_or(int.bitwise_shift_left(hi, 8), lo))
        Error(Nil) -> Error(Nil)
      }
    }
    Error(Nil) -> Error(Nil)
  }
}

// Write a 16-bit value to the bus (little-endian)
pub fn mem_write_u16(bus: Bus, addr: Int, data: Int) -> Result(Bus, Nil) {
  let lo = int.bitwise_and(data, 0xFF)
  let hi = int.bitwise_shift_right(data, 8)

  case mem_write(bus, addr, lo) {
    Ok(new_bus) -> mem_write(new_bus, addr + 1, hi)
    Error(Nil) -> Error(Nil)
  }
}

// Read from PRG ROM with mirroring for smaller ROMs
fn read_prg_rom(bus: Bus, addr: Int) -> Result(Int, Nil) {
  // Map the address to PRG ROM space
  let mapped_addr = addr - prg_rom_start

  case bus.rom {
    None -> Ok(0)
    // No ROM loaded
    Some(rom) -> {
      // Handle mirroring for 16KB PRG ROMs
      let prg_length = iv.length(rom.prg_rom)
      let effective_addr = case prg_length == 0x4000 && mapped_addr >= 0x4000 {
        True -> mapped_addr % 0x4000
        // Mirror if needed (16KB ROM)
        False -> mapped_addr
        // No mirroring (32KB ROM)
      }

      iv.get(rom.prg_rom, effective_addr)
      |> result.replace_error(Nil)
    }
  }
}
