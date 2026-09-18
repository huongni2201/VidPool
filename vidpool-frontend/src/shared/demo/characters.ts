import { demoAvatars, demoProjects } from "@/assets/demo"

export interface DemoCharacter {
  id: string
  name: string
  role: string
  avatar: string
  isNarrator?: boolean
  count?: string
}

export interface DemoVoice {
  id: string
  name: string
  gender: "Nam" | "Nữ" | "Custom"
  language: string
  style: string
  avatar?: string
  isNarrator?: boolean
}

export interface DemoBeatScene {
  id: number
  num: string
  title: string
  prompt: string
  character: string
  characterAvatar?: string
  dialogue: string
  duration: string
  cameraAngle: "Cận cảnh" | "Trung cảnh" | "Toàn cảnh"
  status: "Đã tạo" | "Đang tạo" | "Chờ tạo"
  thumb: string
}

export const demoCharacterList: DemoCharacter[] = [
  {
    id: "c1",
    name: "Mai",
    role: "Nhân vật chính",
    avatar: demoAvatars[0],
    count: "12 video",
  },
  {
    id: "c2",
    name: "Linh",
    role: "Nhân vật chính",
    avatar: demoAvatars[1],
    count: "8 video",
  },
  {
    id: "c3",
    name: "Minh",
    role: "Nhân vật chính",
    avatar: demoAvatars[2],
    count: "15 video",
  },
  {
    id: "c4",
    name: "Bạch Thanh Hạ",
    role: "Phụ",
    avatar: demoAvatars[3],
    count: "4 video",
  },
  {
    id: "c5",
    name: "Lục Viễn Thu",
    role: "Phụ",
    avatar: demoAvatars[1],
    count: "6 video",
  },
  {
    id: "c6",
    name: "Người dẫn chuyện",
    role: "Khác",
    isNarrator: true,
    avatar: demoAvatars[0],
    count: "20 video",
  },
  {
    id: "c7",
    name: "Hoàng Phong",
    role: "Nhân vật chính",
    avatar: demoAvatars[2],
    count: "9 video",
  },
  {
    id: "c8",
    name: "Tiểu Đào",
    role: "Phụ",
    avatar: demoAvatars[0],
    count: "3 video",
  },
]

export const demoVoicesList: DemoVoice[] = [
  {
    id: "v1",
    name: "Mai - Nữ tự nhiên",
    gender: "Nữ",
    language: "Vietnamese",
    style: "Tự nhiên",
    avatar: demoAvatars[0],
  },
  {
    id: "v2",
    name: "Minh - Nam trầm",
    gender: "Nam",
    language: "Vietnamese",
    style: "Chín chắn",
    avatar: demoAvatars[1],
  },
  {
    id: "v3",
    name: "Linh - Nữ trẻ",
    gender: "Nữ",
    language: "Vietnamese",
    style: "Trẻ trung",
    avatar: demoAvatars[2],
  },
  {
    id: "v4",
    name: "Bạch Thanh Hạ",
    gender: "Custom",
    language: "Vietnamese",
    style: "Lạnh lùng",
    avatar: demoAvatars[3],
  },
  {
    id: "v5",
    name: "Lục Viễn Thu",
    gender: "Custom",
    language: "Vietnamese",
    style: "Nhẹ nhàng",
    avatar: demoAvatars[1],
  },
  {
    id: "v6",
    name: "David - Nam quốc tế",
    gender: "Nam",
    language: "English",
    style: "Chuyên nghiệp",
    avatar: demoAvatars[2],
  },
  {
    id: "v7",
    name: "Emma - Nữ quốc tế",
    gender: "Nữ",
    language: "English",
    style: "Tự nhiên",
    avatar: demoAvatars[3],
  },
  {
    id: "v8",
    name: "Người dẫn chuyện",
    gender: "Nam",
    language: "Vietnamese",
    style: "Thuyết minh",
    isNarrator: true,
    avatar: demoAvatars[0],
  },
]

export const demoBeatScenes: DemoBeatScene[] = [
  {
    id: 1,
    num: "01",
    title: "Cô gái thức dậy",
    prompt: "Cô gái trẻ thức dậy trong phòng ngủ, ánh nắng buổi sáng chiếu qua rèm cửa, không khí ấm áp, đời thường, chân thực, soft light, cinematic, high quality",
    character: "Mai",
    characterAvatar: demoAvatars[0],
    dialogue: "Một ngày mới lại bắt đầu...",
    duration: "00:03",
    cameraAngle: "Cận cảnh",
    status: "Đã tạo",
    thumb: demoProjects[0],
  },
  {
    id: 2,
    num: "02",
    title: "Nhìn ra khung cửa sổ",
    prompt: "Cô gái nhìn ra khung cửa sổ, ánh mắt suy tư, gió nhẹ thoảng qua mái tóc",
    character: "Minh",
    characterAvatar: demoAvatars[1],
    dialogue: "Hôm nay... sẽ khác.",
    duration: "00:05",
    cameraAngle: "Trung cảnh",
    status: "Đang tạo",
    thumb: demoProjects[1],
  },
  {
    id: 3,
    num: "03",
    title: "Thành phố buổi sáng",
    prompt: "Toàn cảnh thành phố hiện đại, nhịp sống tấp nập buổi sớm, tia nắng vàng len lỏi",
    character: "-",
    dialogue: "-",
    duration: "00:04",
    cameraAngle: "Toàn cảnh",
    status: "Chờ tạo",
    thumb: demoProjects[2],
  },
  {
    id: 4,
    num: "04",
    title: "Bước ra khỏi nhà",
    prompt: "Cô gái mang balo, bước ra khỏi nhà, nắng sớm ngập tràn lối đi",
    character: "Mai",
    characterAvatar: demoAvatars[0],
    dialogue: "Đi thôi!",
    duration: "00:04",
    cameraAngle: "Trung cảnh",
    status: "Đã tạo",
    thumb: demoProjects[3],
  },
  {
    id: 5,
    num: "05",
    title: "Gặp lại người quen",
    prompt: "Cô gái tình cờ gặp lại người bạn cũ trên phố, hai người nhìn nhau bất ngờ",
    character: "Mai & Minh",
    characterAvatar: demoAvatars[0],
    dialogue: "Lâu rồi không gặp cậu!",
    duration: "00:06",
    cameraAngle: "Trung cảnh",
    status: "Đã tạo",
    thumb: demoProjects[0],
  },
  {
    id: 6,
    num: "06",
    title: "Cuộc trò chuyện chân thành",
    prompt: "Hai người ngồi trên sân thượng, trò chuyện dưới ánh chiều tà ấm áp",
    character: "Mai & Minh",
    characterAvatar: demoAvatars[1],
    dialogue: "Cậu... vẫn như ngày xưa nhỉ?",
    duration: "00:08",
    cameraAngle: "Cận cảnh",
    status: "Đang tạo",
    thumb: demoProjects[1],
  },
  {
    id: 7,
    num: "07",
    title: "Những suy nghĩ",
    prompt: "Cô gái nhìn về phía xa, suy tư về tương lai và những ước mơ còn dang dở",
    character: "Mai",
    characterAvatar: demoAvatars[0],
    dialogue: "Mình thật sự muốn làm gì?",
    duration: "00:05",
    cameraAngle: "Cận cảnh",
    status: "Chờ tạo",
    thumb: demoProjects[2],
  },
  {
    id: 8,
    num: "08",
    title: "Hoàng hôn trên thành phố",
    prompt: "Mặt trời lặn, thành phố lên đèn, biểu tượng thời gian trôi qua",
    character: "-",
    dialogue: "-",
    duration: "00:06",
    cameraAngle: "Toàn cảnh",
    status: "Chờ tạo",
    thumb: demoProjects[3],
  },
]
