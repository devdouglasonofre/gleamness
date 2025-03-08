import gleam/result
import gleeunit
import gleeunit/should
import helpers/list_helpers

pub fn main() {
  gleeunit.main()
}

pub fn get_list_value_by_index_happy_path_test() {
  [10, 14, 3, 42, 6]
  |> list_helpers.get_list_value_by_index(3)
  |> result.unwrap(0)
  |> should.equal(42)
}

pub fn set_list_value_by_index_happy_path_test() {
  [10, 14, 3, 42, 6]
  |> list_helpers.set_list_value_by_index(3, 64)
  |> result.unwrap([0])
  |> should.equal([10, 14, 3, 64, 6])
}
