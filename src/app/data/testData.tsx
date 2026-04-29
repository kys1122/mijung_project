export interface Document {
    id: number;
    title: string;
    description: string;
    institution: string;
    isCompleted: boolean;
    detail?: {
      online?: {name: string, link?: string};
      offline?: string;
      requirements: string[];
      warning?: string;
    }
}

export interface Step {
  id: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  link?: string;
  isCompleted: boolean;
}

export interface TestDataInterface {
  name: string;
  nameEn: string;
  step: Step[];
  document: Document[];
}

//임시 데이터
export const TestData : Record<string, TestDataInterface> = {
  //데이터가 없을 때
  nothingData: {
    name: "데이터 없음", nameEn: "No Data",
    step: [
      {id: 1, title: "데이터가 없습니다.", titleEn: "No data available.", description: "설명없음", descriptionEn: "No description", isCompleted:false}
    ],
    document: [
      {id: 1, title: "데이터가 없습니다.",
        description: "", institution: "",
        isCompleted: false}
    ]
  },
  basicLiving: {
    name: "국민기초생활수급자증명", nameEn: "Basic Living Certificate",
    step: [{ id: 1, title: "정부24 접속", titleEn: "Access Gov24", description: "정부24 사이트 접속", descriptionEn: "Connect to the Gov24 website", isCompleted: false}
    ],
    document:  [
      { id: 1, title: "신분증",
        description: "신원 정보를 증명하는 문서",
        institution: "정부24, 읍·면·동 주민센터",
        isCompleted: false,
        detail: {
          online: {name: "정부24", link: "https://www.gov.kr"},
          offline: "주민센터",
          requirements: ["증명사진"],
          warning: "6개월 이내 촬영한 증명사진 (3.5cm x 4.5cm)"
        }},
      { id: 2, title: "통장 사본",
        description: "급여를 수령할 계좌 확인용",
        institution: "해당 은행",
        isCompleted: false,
      }
    ]
  },
  feeReduction: {
    name: "요금감면 일괄 신청", nameEn: "Utility Fee Reduction",
    step: [
      { id: 1, title: "정부24 접속 후 로그인", titleEn: "Login to Gov24", description: "정부24 사이트 접속", descriptionEn: "Connect to Gov24", link: "https://www.gov.kr", isCompleted: false },
      { id: 2, title: "요금감면 일괄신청 검색 후 서비스 신청", titleEn: "Search and Apply", description: "오른쪽 위 전체메뉴 → 민원 찾기 → 검색창에 '요금감면 일괄신청' 검색 후 신청하기 클릭", descriptionEn: "Search 'Utility Fee Reduction' in the menu and click apply", isCompleted: false},
      { id: 3, title: "신청인 정보 입력 및 감면 자격 확인", titleEn: "Enter Info", description: "시도/시군구 선택 후 [주소조회] 선택 관련 유의사항 읽은 후 동의 체크, 신청인 정보 입력 및 감면 자격 확인", descriptionEn: "Select region, check address, agree to terms, and enter applicant information", isCompleted: false},
      { id: 4, title: "필요한 항목 선택 후 고객번호 입력", titleEn: "Select Items", description: "전기, 도시가스, TV수신료 등 필요한 항목 선택 후 고객번호 입력", descriptionEn: "Select electricity, gas, or TV and enter customer numbers", isCompleted: false},
      { id: 5, title: "신청서 제출", titleEn: "Submit", description: "신청서 제출", descriptionEn: "Submit the application form", isCompleted: false}
    ],
    document: [
      { id: 1, title: "신분증", description: "본인 확인용 신분증", institution: "주민센터", isCompleted: false},
      { id: 2, title: "감면대상 증명서", description: "수급자 증명서 등", institution: "정부24", isCompleted: false}
    ]
  }
}