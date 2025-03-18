import emulation/types.{type Rom, FourScreen, Horizontal, Rom, Vertical}
import gleam/int
import iv

// Constants for NES ROM format
pub const nes_tag = [0x4E, 0x45, 0x53, 0x1A]

pub const prg_rom_page_size = 16_384

// 16 KiB
pub const chr_rom_page_size = 8192

// 8 KiB

// Parse raw binary data into a Rom
pub fn new(raw: iv.Array(Int)) -> Result(Rom, String) {
  // Check if the file starts with the NES tag
  case check_nes_tag(raw) {
    False -> Error("File is not in iNES file format")
    True -> {
      let mapper = case iv.get(raw, 7) {
        Ok(byte7) -> {
          case iv.get(raw, 6) {
            Ok(byte6) ->
              int.bitwise_or(
                int.bitwise_and(byte7, 0b11110000),
                int.bitwise_shift_right(byte6, 4),
              )
            Error(_) -> 0
          }
        }
        Error(_) -> 0
      }

      // Check iNES version
      let ines_ver = case iv.get(raw, 7) {
        Ok(byte7) -> int.bitwise_and(int.bitwise_shift_right(byte7, 2), 0b11)
        Error(_) -> 0
      }

      case ines_ver {
        0 -> {
          // Determine mirroring mode
          let four_screen = case iv.get(raw, 6) {
            Ok(byte6) -> int.bitwise_and(byte6, 0b1000) != 0
            Error(_) -> False
          }
          let vertical_mirroring = case iv.get(raw, 6) {
            Ok(byte6) -> int.bitwise_and(byte6, 0b1) != 0
            Error(_) -> False
          }
          let screen_mirroring = case four_screen, vertical_mirroring {
            True, _ -> FourScreen
            False, True -> Vertical
            False, False -> Horizontal
          }

          // Calculate ROM sizes
          let prg_rom_size = case iv.get(raw, 4) {
            Ok(byte4) -> byte4 * prg_rom_page_size
            Error(_) -> 0
          }
          let chr_rom_size = case iv.get(raw, 5) {
            Ok(byte5) -> byte5 * chr_rom_page_size
            Error(_) -> 0
          }

          // Handle trainer if present
          let skip_trainer = case iv.get(raw, 6) {
            Ok(byte6) -> int.bitwise_and(byte6, 0b100) != 0
            Error(_) -> False
          }
          let prg_rom_start =
            16
            + case skip_trainer {
              True -> 512
              False -> 0
            }
          let chr_rom_start = prg_rom_start + prg_rom_size

          // Extract PRG and CHR ROM data
          case
            extract_rom_data(
              raw,
              prg_rom_start,
              prg_rom_size,
              chr_rom_start,
              chr_rom_size,
            )
          {
            Ok(#(prg_rom, chr_rom)) -> {
              Ok(Rom(
                prg_rom: prg_rom,
                chr_rom: chr_rom,
                mapper: mapper,
                screen_mirroring: screen_mirroring,
              ))
            }
            Error(err) -> Error(err)
          }
        }
        _ -> Error("NES2.0 format is not supported")
      }
    }
  }
}

// Helper function to check if the file starts with the NES tag
fn check_nes_tag(raw: iv.Array(Int)) -> Bool {
  case iv.length(raw) {
    len if len < 4 -> False
    _ -> {
      case iv.get(raw, 0), iv.get(raw, 1), iv.get(raw, 2), iv.get(raw, 3) {
        Ok(n), Ok(e), Ok(s), Ok(eof) -> {
          n == 0x4E
          // 'N'
          && e == 0x45
          // 'E'
          && s == 0x53
          // 'S'
          && eof == 0x1A
          // EOF
        }
        _, _, _, _ -> False
      }
    }
  }
}

// Helper function to extract PRG and CHR ROM data
fn extract_rom_data(
  raw: iv.Array(Int),
  prg_rom_start: Int,
  prg_rom_size: Int,
  chr_rom_start: Int,
  chr_rom_size: Int,
) -> Result(#(iv.Array(Int), iv.Array(Int)), String) {
  // Check if the raw data is large enough
  let raw_length = iv.length(raw)
  case raw_length >= chr_rom_start + chr_rom_size {
    False -> Error("ROM file is too small")
    True -> {
      // Extract PRG ROM
      case iv.slice(raw, prg_rom_start, prg_rom_size) {
        Ok(prg_rom) -> {
          // Extract CHR ROM
          case iv.slice(raw, chr_rom_start, chr_rom_size) {
            Ok(chr_rom) -> Ok(#(prg_rom, chr_rom))
            Error(_) -> Error("Failed to extract CHR ROM data")
          }
        }
        Error(_) -> Error("Failed to extract PRG ROM data")
      }
    }
  }
}
