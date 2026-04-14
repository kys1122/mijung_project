export interface Document {
    id: number;
    title: string;
    description: string;
    institution: string;
    isCompleted: boolean;
}

export interface Step {
  id: number;
  title: string;
  description: string;
  link?: string;
  isCompleted: boolean;
}

export interface TestDataInterface {
    name: string;
    step: Step[];
    document: Document[];
}

//임시 데이터
export const TestData : Record<string, TestDataInterface> = {
  //데이터가 없을 때
  nothingData: {
    name: "데이터 없음",
    step: [
      {id: 1, title: "데이터가 없습니다.", description: "설명없음", isCompleted:false}
    ],
    document: [
      {id: 1, title: "데이터가 없습니다.", description: "", institution: "", isCompleted: false}
    ]
  },
  basicLiving: {
    name: "국민기초생활수급자증명",
    step: [
      {id: 1, title: "정부24 접속", description: "정부24 사이트 접속", isCompleted: false}
    ],
    document:  [
      { id: 1, title: "신분증", description: "신원 정보를 증명하는 문서", institution: "정부24, 읍·면·동 주민센터", isCompleted: false},
      { id: 2, title: "통장 사본", description: "급여를 수령할 계좌 확인용", institution: "해당 은행", isCompleted: false}
    ]
  },
  feeReduction: {
    name: "요금감면 일괄 신청",
    step: [
      {id: 1, title: "정부24 접속 후 로그인", description: "정부24 사이트 접속", link: "https://www.gov.kr", isCompleted: false},
      {id: 2, title: "요금감면 일괄신청 검색 후 서비스 신청", description: "오른쪽 위 전체메뉴 → 민원 찾기 → 검색창에 '요금감면 일괄신청' 검색 후 신청하기 클릭", isCompleted: false},
      {id: 3, title: "신청인 정보 입력 및 감면 자격 확인", description: "시도/시군구 선택 후 [주소조회] 선택 관련 유의사항 읽은 후 동의 체크, 신청인 정보 입력 및 감면 자격 확인", isCompleted: false},
      {id: 4, title: "필요한 항목 선택 후 고객번호 입력", description: "전기, 도시가스, TV수신료 등 필요한 항목 선택 후 고객번호 입력", isCompleted: false},
      {id: 5, title: "신청서 제출", description: "신청서 제출", isCompleted: false}
    ],
    document: [
      { id: 1, title: "신분증", description: "본인 확인용 신분증", institution: "주민센터", isCompleted: false},
      { id: 2, title: "감면대상 증명서", description: "수급자 증명서 등", institution: "정부24", isCompleted: false}
    ]
  }
}