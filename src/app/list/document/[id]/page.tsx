"use client"

import { Building2, Check, ChevronLeft, ExternalLink, Volume2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { TestData } from "@/app/data/testData";
import DetailModal from "./detailModal";

const DocumentScreen : React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [doc, setDoc] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  //id에 맞는 데이터 연결, 없는 id면 데이터 없음을 안내
  useEffect(()=>{
  if(id && TestData[id]){
      setDoc(TestData[id].document);
  } else {
      setDoc(TestData["nothingData"].document);
  }
  }, [id]);

  //진행 상황 계산
  const currentData = TestData[id] || TestData["nothingData"];
  const completedCount = doc.filter(d =>  d.isCompleted).length;

  //완료 상태
  const Complete =  (docId: number) => {
      setDoc(doc.map(d => d.id == docId ? {...d, isCompleted: !d.isCompleted} : d));
  }

  const handleOpenDetail = (docItem: any) => {
    setSelectedDoc(docItem);
    setModalOpen(true);
  };

  return(
    <div className="flex flex-col items-center bg-white">
      <header className="w-full max-w-[450px] py-3 justify-between border-b-2 border-[#C9C9C9]">
        <button
          onClick={() => router.back()}
          className="flex items-center activate:opacity-40 transition-opacity gap-1"
        >
          <ChevronLeft className="w-8 h-8 text-black"/>
          <span className="text-[22px] text-black">민원 절차 화면으로</span>
        </button>
      </header>

      <div className="w-full max-w-[450px]">
        <h1 className="pt-[15px] text-[33px] font-bold">필요한 서류 보기</h1>
        <div className="mt-[25px] mx-2 pt-[10px] px-5 pb-4 bg-[#E9F1FF] rounded-[15px]">
          <h2 className="mb-3 text-[26px] font-bold text-black">필요 서류 ({completedCount}/{doc.length})</h2>
          <div className="flex flex-col">
            {doc.map((doc) => (
              <div key={doc.id} className="flex items-center">
                <div className="w-6 h-6 items-center justify-center border border-black rounded-full bg-white">
                  {doc.isCompleted && <Check className="w-5.5 h-5.5 text-black"/>}
                </div>
                <span className={`ml-1.5 text-[22px] font-medium ${doc.isCompleted ? 'text-[#B3B3B3] line-through' : 'text-black'}`}>
                  {doc.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-7 p-5 mt-8">
          {doc.map((doc => (
            <div key={doc.id} className={`p-4 py-3 border-2 rounded-[10px] ${doc.isCompleted ? 'border-[#8F8F8F] bg-[#DBDBDB]' : 'border-[#9A9A9A] bg-[#white]'}`}>
              <h2 className={`text-[30px] font-bold ${doc.isCompleted ? 'text-[#858585]' : 'text-black'}`}>
                {doc.id}. {doc.title}
              </h2>
              <p className={`mx-2 text-[24px] ${doc.isCompleted ? 'text-[#858585]' : 'text-black'}`}>
                {doc.description}
              </p>
              <div className="px-1.5 mt-6 flex items-center">
                <Building2 className={`w-7 h-7 ${doc.isCompleted ? 'text-[#858585]' : 'text-black'}`}/>
                <p className={`pl-1.5 text-[26px] font-medium ${doc.isCompleted ? 'text-[#858585]' : 'text-black'}`}>발급기관</p>
              </div>
              <p className={`mx-2.5 text-[20px] ${doc.isCompleted ? 'text-[#858585]' : 'text-black'}`}>{doc.institution}</p>
              <div className="flex flex-col">
                <button
                  onClick={() => handleOpenDetail(doc)}
                  className="mb-2 mx-2.5 mt-6 py-1.5 flex items-center justify-center bg-[#3F85FF] rounded-[10px] text-white text-[22px] font-bold"
                >
                  자세히보기
                </button>
                <DetailModal 
                  isOpen={modalOpen} 
                  onClose={() => setModalOpen(false)} 
                  data={selectedDoc} 
                />
                <button
                  onClick={() => Complete(doc.id)}
                  className="mt-4 flex items-center"
                >
                  <div className={`w-9 h-9 flex items-center justify-center ${doc.isCompleted ? 'bg-[#8F8F8F]' : 'bg-[#F1F1F1]'}`}>
                    {doc.isCompleted && <Check className="text-white w-7 h-7"/>}
                  </div>
                  <span className={`ml-2 text-[24px] font-bold ${doc.isCompleted ? 'text-[#858585]' : 'text-black'}`}>완료</span>
                </button>
              </div>
            </div>
          )))}

        </div>
      </div>
    </div>
  )
}

export default DocumentScreen;