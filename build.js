const fs = require('fs');
const path = require('path');

const TSV_FILE = path.join(__dirname, 'students_full_db.tsv');
const OUT_FILE = path.join(__dirname, 'public', 'students.json');

function parseTSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split('\t');
    return lines.slice(1).map(line => {
        const vals = line.split('\t');
        const row = {};
        headers.forEach((h, j) => row[h] = vals[j] || '');
        const cls = row.std_class || '';
        const m = cls.match(/^ม\.(\d)/);
        row.grade = m ? 'ม.' + m[1] : '';
        row.gradeNum = m ? parseInt(m[1]) : 0;
        row.gender = row.std_title === 'เด็กชาย' ? 'ชาย' : (row.std_title === 'เด็กหญิง' ? 'หญิง' : '');
        return row;
    });
}

const text = fs.readFileSync(TSV_FILE, 'utf8');
const students = parseTSV(text);
students.sort((a, b) => {
    if (a.gradeNum !== b.gradeNum) return a.gradeNum - b.gradeNum;
    const roomA = (a.std_room || '').padStart(3, '0');
    const roomB = (b.std_room || '').padStart(3, '0');
    if (roomA !== roomB) return roomA.localeCompare(roomB);
    return parseInt(a.std_no || '0') - parseInt(b.std_no || '0');
});

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(students));
console.log(`Generated ${OUT_FILE} (${students.length} students)`);

// Stats
const byGrade = {};
const byGender = { ชาย: 0, หญิง: 0 };
const byRoom = {};
students.forEach(r => {
    byGrade[r.grade] = (byGrade[r.grade] || 0) + 1;
    byGender[r.gender] = (byGender[r.gender] || 0) + 1;
    byRoom[r.std_room] = (byRoom[r.std_room] || 0) + 1;
});
fs.writeFileSync(path.join(__dirname, 'public', 'stats.json'), JSON.stringify({ total: students.length, byGrade, byGender, byRoom }));
console.log('Generated stats.json');