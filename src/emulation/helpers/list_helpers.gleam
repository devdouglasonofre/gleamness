import gleam/list

pub fn get_list_value_by_index(list: List(a), index: Int) -> Result(a, Nil) {
  case list, index {
    [], _ -> Error(Nil)
    [first, ..], 0 -> Ok(first)
    [_, ..rest], i if i > 0 -> get_list_value_by_index(rest, i - 1)
    _, _ -> Error(Nil)
  }
}

pub fn set_list_value_by_index(
  list: List(a),
  index: Int,
  value: a,
) -> Result(List(a), Nil) {
  case index < 0 {
    True -> Error(Nil)
    False -> set_list_value_by_index_tail(list, index, value, [])
  }
}

fn set_list_value_by_index_tail(
  list: List(a),
  index: Int,
  value: a,
  acc: List(a),
) -> Result(List(a), Nil) {
  case list, index {
    [], _ -> Error(Nil)
    [_head, ..rest], 0 ->
      Ok(list.append(list.append(list.reverse(acc), [value]), rest))
    [head, ..rest], i ->
      set_list_value_by_index_tail(rest, i - 1, value, [head, ..acc])
  }
}
