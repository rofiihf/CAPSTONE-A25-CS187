import XLSX from "xlsx";
import fs from "fs";

function convertXlsxToJson(inputPath, outputPath) {
  const workbook = XLSX.readFile(inputPath);
  const sheetName = "Course";

  if (!workbook.Sheets[sheetName]) {
    throw new Error(`Sheet '${sheetName}' tidak ditemukan.`);
  }

  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  });

  const formatted = rows.map(r => ({
    course_id: r.course_id,
    learning_path_id: r.learning_path_id,
    course_name: r.course_name,
    course_level_str: r.course_level_str,
    hours_to_study: r.hours_to_study,
  }));

  fs.writeFileSync(outputPath, JSON.stringify(formatted, null, 2), "utf8");
  console.log(`Converted: ${outputPath}`);
}

convertXlsxToJson(
  "D:/Coding (PROJECT)/CAPSTONE/chatbot/CAPSTONE-A25-CS187/backend/data/course.xlsx",
  "D:/Coding (PROJECT)/CAPSTONE/chatbot/CAPSTONE-A25-CS187/backend/data/course.json"
);

