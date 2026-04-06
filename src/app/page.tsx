import React from 'react';
import Image from "next/image";
import Link from 'next/link';

const MainScreen : React.FC = () => {
  return(
    <div className='pt-[200px] flex flex-col items-center justify-between bg-white'>
      <h1 className='text-[22px] font-medium text-black'>
        외국인, 노인, 저소득층 민원 안내
      </h1>
      <div className='mt-10'>
        <Image
          src="/logo.png"
          alt="korea logo"
          width={173}
          height={173}
          priority
        />
      </div>
      <div className='mt-20'>
        <Link href={"/user/login"}>
        <button className='w-[306px] py-[10px] bg-[#009DFF] hover:bg-[#0089e0] active:scale-[0.98] transition-all rounded-[15px] text-white text-[36px] font-bold'>
          시작하기
        </button>
        </Link>
      </div>
    </div>
  );
}

export default MainScreen;