import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";
import cover4 from "@/assets/cover-4.jpg";
import cover5 from "@/assets/cover-5.jpg";
import cover6 from "@/assets/cover-6.jpg";

export const covers = [cover1, cover2, cover3, cover4, cover5, cover6];

export type Status = "Em andamento" | "Completo";

export type Manga = {
  title: string;
  rating: number;
  status: Status;
  genres: string[];
  cover: string;
  chapter: string;
  views: string;
};

export const destaques = [
  {
    rank: "1º",
    title: "A Criada Domada do Conde Calleigh",
    rating: 4.8,
    status: "Em andamento" as Status,
    genres: ["Romance", "Fantasia", "Drama"],
    image: hero1,
    synopsis:
      "Ela serviu a problemática filha mais nova de uma família nobre por mais de quatro anos. Quando o herdeiro retorna, ele faz uma proposta inesperada: tornar-se sua “criada de castigo” por três meses.",
  },
  {
    rank: "2º",
    title: "Rompa Minha Maldição, Sir Cavaleiro",
    rating: 4.7,
    status: "Em andamento" as Status,
    genres: ["Romance", "Demônios", "Maldições"],
    image: hero2,
    synopsis:
      "Verônica perdeu tudo — sua casa, sua família e até sua humanidade. Seus olhos vermelhos monstruosos só veem horror, até que Leon, um cavaleiro sagrado renegado, a beija. Ele seria sua única esperança de salvação?",
  },
];

export const noticias = [
  "O Suplício de Ser Vista lidera a enquete “Mangá Que Queremos Ver Animado” da AnimeJapan 2026",
  "Fênix: Arco do Futuro, de Osamu Tezuka, ganha adaptação imersiva para os palcos",
  "Casei com a Garota Que Mais Odeio na Sala ganha audiolivro pela Seven Seas",
  "Sequência do mangá KenIchi: O Discípulo Mais Forte é anunciada",
  "Mangá de Precure das gêmeas Kamikita se encerra após 22 anos",
];

export const generos = [
  "Ação",
  "Romance",
  "Fantasia",
  "Drama",
  "Comédia",
  "Isekai",
  "Terror",
  "Slice of Life",
  "Escolar",
  "Sobrenatural",
  "Aventura",
  "Mistério",
];

export const ranking: Manga[] = [
  {
    title: "As Amigas da Minha Madrasta",
    rating: 4.6,
    status: "Completo",
    genres: ["Romance", "Drama"],
    cover: cover5,
    chapter: "Cap. 118",
    views: "2,4M",
  },
  {
    title: "Irmãs Senhorias",
    rating: 4.8,
    status: "Em andamento",
    genres: ["Romance"],
    cover: cover1,
    chapter: "Cap. 76",
    views: "1,9M",
  },
  {
    title: "A Sepultura do Cisne",
    rating: 4.3,
    status: "Em andamento",
    genres: ["Drama"],
    cover: cover6,
    chapter: "Cap. 42",
    views: "1,4M",
  },
  {
    title: "O Rei Demônio Quer Viver em Paz",
    rating: 4.7,
    status: "Completo",
    genres: ["Fantasia"],
    cover: cover2,
    chapter: "Cap. 201",
    views: "1,2M",
  },
  {
    title: "Algo Sobre Você",
    rating: 4.9,
    status: "Em andamento",
    genres: ["Romance"],
    cover: cover3,
    chapter: "Cap. 64",
    views: "980 mil",
  },
  {
    title: "Lâmina Sob a Lua de Inverno",
    rating: 4.5,
    status: "Em andamento",
    genres: ["Ação"],
    cover: cover4,
    chapter: "Cap. 33",
    views: "870 mil",
  },
];

export const populares: Manga[] = [
  {
    title: "Vamos Nos Encontrar Depois do Trabalho",
    rating: 4.7,
    status: "Completo",
    genres: ["Romance", "Slice of Life"],
    cover: cover1,
    chapter: "Cap. 96",
    views: "3,1M",
  },
  {
    title: "Não Existe Deusa na Minha Faculdade?",
    rating: 4.5,
    status: "Completo",
    genres: ["Romance", "Escolar"],
    cover: cover3,
    chapter: "Cap. 58",
    views: "2,7M",
  },
  {
    title: "O Rei Demônio Quer Viver em Paz",
    rating: 4.7,
    status: "Em andamento",
    genres: ["Fantasia", "Isekai"],
    cover: cover2,
    chapter: "Cap. 201",
    views: "2,2M",
  },
  {
    title: "Lâmina Sob a Lua de Inverno",
    rating: 4.6,
    status: "Em andamento",
    genres: ["Ação", "Aventura"],
    cover: cover4,
    chapter: "Cap. 33",
    views: "1,8M",
  },
  {
    title: "Tarde Cor de Âmbar",
    rating: 4.4,
    status: "Em andamento",
    genres: ["Drama", "Slice of Life"],
    cover: cover5,
    chapter: "Cap. 21",
    views: "1,5M",
  },
  {
    title: "Fita Vermelha na Chuva",
    rating: 4.8,
    status: "Em andamento",
    genres: ["Mistério", "Sobrenatural"],
    cover: cover6,
    chapter: "Cap. 87",
    views: "1,3M",
  },
];

export const lancamentos: Manga[] = [
  {
    title: "Irmãs Senhorias",
    rating: 4.8,
    status: "Em andamento",
    genres: ["Romance"],
    cover: cover1,
    chapter: "Cap. 77 · há 12 min",
    views: "",
  },
  {
    title: "Fita Vermelha na Chuva",
    rating: 4.8,
    status: "Em andamento",
    genres: ["Mistério"],
    cover: cover6,
    chapter: "Cap. 88 · há 40 min",
    views: "",
  },
  {
    title: "Algo Sobre Você",
    rating: 4.9,
    status: "Em andamento",
    genres: ["Romance"],
    cover: cover3,
    chapter: "Cap. 65 · há 2 h",
    views: "",
  },
  {
    title: "Lâmina Sob a Lua de Inverno",
    rating: 4.5,
    status: "Em andamento",
    genres: ["Ação"],
    cover: cover4,
    chapter: "Cap. 34 · há 5 h",
    views: "",
  },
  {
    title: "O Rei Demônio Quer Viver em Paz",
    rating: 4.7,
    status: "Completo",
    genres: ["Fantasia"],
    cover: cover2,
    chapter: "Cap. 202 · há 9 h",
    views: "",
  },
  {
    title: "Tarde Cor de Âmbar",
    rating: 4.4,
    status: "Em andamento",
    genres: ["Drama"],
    cover: cover5,
    chapter: "Cap. 22 · há 1 d",
    views: "",
  },
];
