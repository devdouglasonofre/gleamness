pub fn get_list_value_by_index(list: List(Int), index: Int) -> Result(Int, Nil) {
  case list, index {
    [], _ -> Error(Nil)
    [first, ..], 0 -> Ok(first)
    [_, ..rest], i if i > 0 -> get_list_value_by_index(rest, i - 1)
    _, _ -> Error(Nil)
  }
}

pub fn set_list_value_by_index(
  list: List(Int),
  index: Int,
  value: Int,
) -> Result(List(Int), Nil) {
  case list, index {
    // Error cases - empty list or negative index
    [], _ -> Error(Nil)
    _, i if i < 0 -> Error(Nil)

    // Base case - we found the position to update
    [_, ..rest], 0 -> Ok([value, ..rest])

    // Recursive case - keep searching
    [head, ..tail], i -> {
      case set_list_value_by_index(tail, i - 1, value) {
        Ok(new_tail) -> Ok([head, ..new_tail])
        Error(err) -> Error(err)
      }
    }
  }
}
