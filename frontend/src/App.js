import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import CornerNotes from "@/components/CornerNotes";
import NotFound from "@/components/NotFound";
import BlogIndex from "@/pages/BlogIndex";
import Home from "@/pages/Home";
import Post from "@/pages/Post";
import { useBeacon } from "@/lib/use-stats";

function Beacon() {
  const { pathname } = useLocation();
  useBeacon(pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <CornerNotes />
      <Beacon />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<Post />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
