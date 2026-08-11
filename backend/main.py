from input.excel_reader import ExcelReader


def main():
    reader = ExcelReader("backend/samples/SampleTestcases.xlsx")
    test_cases = reader.read_test_cases()

    for test_case in test_cases:
        print(test_case)


if __name__ == "__main__":
    main()