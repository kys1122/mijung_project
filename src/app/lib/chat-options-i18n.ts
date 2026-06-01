// 챗봇 옵션 라벨 한국어 ↔ 영어 매핑.
// 값은 한국어 그대로 챗봇 백엔드로 보내고, 화면에 표시만 lang에 맞춰 바꾼다.

import type { LangCode } from './languages';

const USER_TYPE: Record<string, Record<LangCode, string>> = {
  '노인/고령자':  { ko: '노인/고령자',   en: 'Senior',     zh: '老人',   vi: 'Người cao tuổi', th: 'ผู้สูงอายุ',  ja: '高齢者',     tl: 'Senior',         id: 'Lansia',        my: 'သက်ကြီးရွယ်အို', km: 'មនុស្សចាស់',     mn: 'Ахмад настан', uz: 'Keksa',         ne: 'जेष्ठ नागरिक',  ru: 'Пожилой' },
  '저소득층':    { ko: '저소득층',     en: 'Low-income', zh: '低收入', vi: 'Thu nhập thấp', th: 'รายได้น้อย', ja: '低所得',     tl: 'Mababang kita',  id: 'Berpendapatan rendah', my: 'ဝင်ငွေနည်း',   km: 'ប្រាក់ចំណូលទាប', mn: 'Бага орлоготой', uz: 'Past daromad', ne: 'न्यून आय',      ru: 'Малоимущий' },
  '외국인':      { ko: '외국인',       en: 'Foreigner',  zh: '外国人', vi: 'Người nước ngoài', th: 'ชาวต่างชาติ', ja: '外国人',    tl: 'Dayuhan',        id: 'Orang asing',   my: 'နိုင်ငံခြားသား', km: 'ជនបរទេស',       mn: 'Гадаадын',     uz: 'Chet ellik',    ne: 'विदेशी',         ru: 'Иностранец' },
  '해당없음':    { ko: '해당없음',     en: 'None / Other', zh: '其他', vi: 'Khác',         th: 'อื่นๆ',       ja: 'その他',     tl: 'Iba pa',         id: 'Lainnya',       my: 'အခြား',       km: 'ផ្សេងទៀត',         mn: 'Бусад',        uz: 'Boshqa',        ne: 'अन्य',          ru: 'Другое' },
};

const AGE_GROUP: Record<string, Record<LangCode, string>> = {
  '10대':       { ko: '10대',  en: 'Teens', zh: '10多岁', vi: 'Tuổi teen', th: 'วัยรุ่น', ja: '10代', tl: 'Tinedyer', id: 'Remaja', my: 'ဆယ်ကျော်သက်', km: 'យុវវ័យ',    mn: '10-19 нас', uz: 'Oʻsmir', ne: 'किशोर',  ru: 'Подросток' },
  '20대':       { ko: '20대',  en: '20s',   zh: '20多岁', vi: '20s',       th: '20s',     ja: '20代', tl: '20s',     id: '20-an',  my: '20',          km: '20',         mn: '20-29 нас', uz: '20',     ne: '२० दशक', ru: '20-е' },
  '30대':       { ko: '30대',  en: '30s',   zh: '30多岁', vi: '30s',       th: '30s',     ja: '30代', tl: '30s',     id: '30-an',  my: '30',          km: '30',         mn: '30-39 нас', uz: '30',     ne: '३० दशक', ru: '30-е' },
  '40대':       { ko: '40대',  en: '40s',   zh: '40多岁', vi: '40s',       th: '40s',     ja: '40代', tl: '40s',     id: '40-an',  my: '40',          km: '40',         mn: '40-49 нас', uz: '40',     ne: '४० दशक', ru: '40-е' },
  '50대':       { ko: '50대',  en: '50s',   zh: '50多岁', vi: '50s',       th: '50s',     ja: '50代', tl: '50s',     id: '50-an',  my: '50',          km: '50',         mn: '50-59 нас', uz: '50',     ne: '५० दशक', ru: '50-е' },
  '60대 이상':  { ko: '60대 이상', en: '60+', zh: '60岁以上', vi: '60+', th: '60+', ja: '60代以上', tl: '60+', id: '60+', my: '60+', km: '60+', mn: '60+', uz: '60+', ne: '६० माथि', ru: '60+' },
};

const CATEGORY: Record<string, Record<LangCode, string>> = {
  '민원서류':       { ko: '민원서류',      en: 'Documents',         zh: '证明文件', vi: 'Giấy tờ',        th: 'เอกสาร',       ja: '証明書',       tl: 'Mga dokumento', id: 'Dokumen',         my: 'စာရွက်စာတမ်း',  km: 'ឯកសារ',      mn: 'Бичиг баримт', uz: 'Hujjatlar',  ne: 'कागजात',         ru: 'Документы' },
  '복지':           { ko: '복지',         en: 'Welfare',           zh: '福利',     vi: 'Phúc lợi',       th: 'สวัสดิการ',     ja: '福祉',         tl: 'Kapakanan',     id: 'Kesejahteraan',   my: 'လူမှုဖူလုံရေး',   km: 'សុខុមាលភាព',     mn: 'Халамж',       uz: 'Farovonlik', ne: 'कल्याण',          ru: 'Соцпомощь' },
  '주거':           { ko: '주거',         en: 'Housing',           zh: '住房',     vi: 'Nhà ở',          th: 'ที่อยู่อาศัย',   ja: '住居',         tl: 'Pabahay',       id: 'Perumahan',       my: 'အိုးအိမ်',         km: 'លំនៅដ្ឋាន',       mn: 'Орон сууц',    uz: 'Uy-joy',     ne: 'आवास',           ru: 'Жильё' },
  '의료':           { ko: '의료',         en: 'Medical',           zh: '医疗',     vi: 'Y tế',           th: 'การแพทย์',      ja: '医療',         tl: 'Medikal',       id: 'Medis',           my: 'ဆေးဘက်ဆိုင်ရာ',  km: 'វេជ្ជសាស្ត្រ',     mn: 'Эмчилгээ',     uz: 'Tibbiy',     ne: 'चिकित्सा',         ru: 'Медицина' },
  '생활지원':       { ko: '생활지원',      en: 'Living support',    zh: '生活支持', vi: 'Hỗ trợ sinh hoạt', th: 'สนับสนุนความเป็นอยู่', ja: '生活支援', tl: 'Suporta sa pamumuhay', id: 'Bantuan hidup', my: 'နေထိုင်မှု ထောက်ပံ့မှု', km: 'ការគាំទ្រការរស់នៅ', mn: 'Амьжиргааны дэмжлэг', uz: 'Yashash yordami', ne: 'जीवनयापन सहायता',  ru: 'Поддержка' },
  '출입국':         { ko: '출입국',        en: 'Immigration',       zh: '出入境',   vi: 'Xuất nhập cảnh', th: 'ตรวจคนเข้าเมือง', ja: '出入国',     tl: 'Imigrasyon',    id: 'Imigrasi',        my: 'လူဝင်မှုကြီးကြပ်ရေး', km: 'អន្តោប្រវេសន៍',  mn: 'Цагаачлал',    uz: 'Migratsiya', ne: 'अध्यागमन',         ru: 'Миграция' },
  '교육·문화':      { ko: '교육·문화',     en: 'Education & Culture', zh: '教育·文化', vi: 'Giáo dục & Văn hóa', th: 'การศึกษาและวัฒนธรรม', ja: '教育・文化', tl: 'Edukasyon at Kultura', id: 'Pendidikan & Budaya', my: 'ပညာရေး · ယဉ်ကျေးမှု', km: 'អប់រំ·វប្បធម៌', mn: 'Боловсрол · Соёл', uz: "Ta'lim va madaniyat", ne: 'शिक्षा · संस्कृति',   ru: 'Образование' },
  '잘 모르겠어요': { ko: '잘 모르겠어요',  en: "I'm not sure",      zh: '不确定',   vi: 'Tôi không chắc', th: 'ไม่แน่ใจ',     ja: 'よくわかりません', tl: 'Hindi sigurado', id: 'Tidak yakin',     my: 'မသေချာဘူး',     km: 'មិនច្បាស់',       mn: 'Мэдэхгүй',     uz: 'Bilmayman',  ne: 'थाहा छैन',         ru: 'Не уверен' },
  '돌봄':          { ko: '돌봄',          en: 'Care',              zh: '照护',     vi: 'Chăm sóc',       th: 'การดูแล',       ja: 'ケア',         tl: 'Pangangalaga',  id: 'Perawatan',       my: 'ပြုစုစောင့်ရှောက်မှု', km: 'ការថែទាំ',         mn: 'Асрамж',       uz: "Parvarish",  ne: 'हेरचाह',          ru: 'Уход' },
};

function translate(label: string, table: Record<string, Record<LangCode, string>>, lang: LangCode): string {
  const entry = table[label];
  if (!entry) return label; // 매핑 없으면 원문 그대로
  return entry[lang] ?? entry.en ?? label;
}

export function tUserType(label: string, lang: LangCode) { return translate(label, USER_TYPE, lang); }
export function tAgeGroup(label: string, lang: LangCode) { return translate(label, AGE_GROUP, lang); }
export function tCategory(label: string, lang: LangCode) { return translate(label, CATEGORY, lang); }

// 절차 step.title — checklist API가 내려보내는 고정 한국어 라벨
const STEP_TITLE: Record<string, Record<LangCode, string>> = {
  '신청 자격 확인하기':   { ko: '신청 자격 확인하기',   en: 'Check eligibility', zh: '检查申请资格', vi: 'Kiểm tra điều kiện', th: 'ตรวจสอบสิทธิ์', ja: '申請資格を確認', tl: 'Suriin ang pagiging karapat-dapat', id: 'Periksa kelayakan', my: 'အရည်အချင်း စစ်ဆေး', km: 'ពិនិត្យសិទ្ធិ', mn: 'Эрх шалгах', uz: 'Huquqni tekshirish', ne: 'योग्यता जाँच', ru: 'Проверить право' },
  '오프라인으로 신청하기': { ko: '오프라인으로 신청하기', en: 'Apply offline',     zh: '线下申请',      vi: 'Đăng ký trực tiếp',  th: 'สมัครออฟไลน์',  ja: 'オフラインで申請', tl: 'Mag-apply offline', id: 'Daftar offline', my: 'အော့ဖ်လိုင်း လျှောက်ထား', km: 'ដាក់ពាក្យដោយផ្ទាល់', mn: 'Биечлэн өргөдөл', uz: 'Oflayn ariza', ne: 'अफलाइन आवेदन', ru: 'Подать офлайн' },
  '온라인으로 신청하기':   { ko: '온라인으로 신청하기',   en: 'Apply online',      zh: '线上申请',      vi: 'Đăng ký trực tuyến', th: 'สมัครออนไลน์',  ja: 'オンラインで申請',  tl: 'Mag-apply online',  id: 'Daftar online',  my: 'အွန်လိုင်း လျှောက်ထား',     km: 'ដាក់ពាក្យតាមអ៊ីនធឺណិត', mn: 'Онлайн өргөдөл',  uz: 'Onlayn ariza',  ne: 'अनलाइन आवेदन',  ru: 'Подать онлайн' },
  '신청 접수 진행':       { ko: '신청 접수 진행',       en: 'Submit application', zh: '提交申请',      vi: 'Nộp đơn',            th: 'ส่งใบสมัคร',     ja: '申請を提出',        tl: 'Magsumite ng aplikasyon', id: 'Kirim aplikasi', my: 'လျှောက်လွှာ တင်သွင်း',      km: 'ដាក់ស្នើ',                mn: 'Өргөдөл өгөх',    uz: 'Ariza topshirish',  ne: 'आवेदन पेश',    ru: 'Подать заявку' },
};

export function tStepTitle(label: string, lang: LangCode) { return translate(label, STEP_TITLE, lang); }

// 자주 등장하는 한국어 서류명 — required-docs API 응답의 doc.title
const DOC_TITLE: Record<string, Record<LangCode, string>> = {
  '신분증':         { ko: '신분증',         en: 'ID card',           zh: '身份证',       vi: 'CMND/CCCD',         th: 'บัตรประชาชน',     ja: '身分証',          tl: 'ID',                  id: 'KTP',                  my: 'အထောက်အထား ကတ်',     km: 'អត្តសញ្ញាណប័ណ្ណ',          mn: 'Иргэний үнэмлэх', uz: 'Shaxsiy guvohnoma', ne: 'परिचयपत्र',          ru: 'Удостоверение' },
  '주민등록증':     { ko: '주민등록증',     en: 'Resident ID',        zh: '居民身份证',   vi: 'CMND',              th: 'บัตรประชาชน',     ja: '住民登録証',      tl: 'Resident ID',         id: 'KTP',                  my: 'နေထိုင်ခွင့်ကတ်',         km: 'អត្តសញ្ញាណបណ្ណប្រជាជន',   mn: 'Иргэний үнэмлэх', uz: 'Yashash guvohnomasi', ne: 'नागरिकता',         ru: 'Удостоверение резидента' },
  '운전면허증':     { ko: '운전면허증',     en: "Driver's license",   zh: '驾照',         vi: 'Bằng lái xe',        th: 'ใบขับขี่',         ja: '運転免許証',      tl: "Lisensya",            id: 'SIM',                  my: 'ယာဉ်မောင်းလိုင်စင်',     km: 'ប័ណ្ណបើកបរ',           mn: 'Жолооны үнэмлэх', uz: 'Haydovchilik guvohnomasi', ne: 'सवारी चालक अनुमतिपत्र', ru: 'Водит. удостоверение' },
  '여권':           { ko: '여권',           en: 'Passport',           zh: '护照',         vi: 'Hộ chiếu',          th: 'หนังสือเดินทาง',   ja: 'パスポート',      tl: 'Pasaporte',           id: 'Paspor',               my: 'နိုင်ငံကူးလက်မှတ်',       km: 'លិខិតឆ្លងដែន',          mn: 'Гадаад паспорт',  uz: 'Pasport',         ne: 'राहदानी',          ru: 'Паспорт' },
  '신청서':         { ko: '신청서',         en: 'Application form',   zh: '申请表',        vi: 'Đơn đăng ký',        th: 'แบบฟอร์มสมัคร',    ja: '申請書',          tl: 'Form ng aplikasyon',  id: 'Formulir aplikasi',    my: 'လျှောက်လွှာ',          km: 'ពាក្យសុំ',                mn: 'Өргөдөл',         uz: 'Ariza shakli',    ne: 'आवेदन फारम',       ru: 'Заявление' },
  '신고서':         { ko: '신고서',         en: 'Declaration form',   zh: '申报表',        vi: 'Tờ khai',           th: 'แบบฟอร์มแจ้ง',     ja: '届出書',          tl: 'Form ng pahayag',     id: 'Formulir pernyataan',  my: 'အသိပေးချက်',          km: 'លិខិតប្រកាស',           mn: 'Мэдүүлэг',        uz: 'Deklaratsiya',    ne: 'घोषणापत्र',         ru: 'Декларация' },
  '금융정보 등 제공 동의서': { ko: '금융정보 등 제공 동의서', en: 'Financial info consent form', zh: '金融信息提供同意书', vi: 'Đồng ý cung cấp thông tin tài chính', th: 'ใบยินยอมข้อมูลการเงิน', ja: '金融情報提供同意書', tl: 'Pahintulot ng impormasyong pampinansyal', id: 'Persetujuan info keuangan', my: 'ဘဏ္ဍာရေး အချက်အလက် သဘောတူခွင့်', km: 'យល់ព្រមផ្តល់ព័ត៌មានហិរញ្ញវត្ថុ', mn: 'Санхүүгийн мэдээлэл өгөх зөвшөөрөл', uz: 'Moliyaviy ma\'lumotga rozilik', ne: 'वित्तीय जानकारी सहमति', ru: 'Согласие на финансовые сведения' },
  '통장 사본':       { ko: '통장 사본',       en: 'Bank passbook copy', zh: '存折复印件',    vi: 'Bản sao sổ tiết kiệm', th: 'สำเนาสมุดบัญชี',    ja: '通帳コピー',      tl: 'Kopya ng bankbook',    id: 'Salinan buku tabungan',  my: 'ဘဏ်စာအုပ်မိတ္တူ',         km: 'ច្បាប់ចម្លងសៀវភៅធនាគារ',  mn: 'Дансны хуулбар',  uz: 'Hisob kitobchasi nusxasi', ne: 'बैंक खाताको प्रतिलिपि', ru: 'Копия сберкнижки' },
};
export function tDocTitle(label: string, lang: LangCode) { return translate(label, DOC_TITLE, lang); }
