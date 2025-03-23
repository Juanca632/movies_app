import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import movie_navbar from "../../assets/movie_navbar.svg"

function Navbar() {
  const navigate = useNavigate();

  return (
    <div className="bg-zinc-900 h-[70px] md:sticky top-0 z-40 xl:px-10 px-5">
      <ul className="w-full h-full flex justify-between items-center">
        <li className="h-full py-2 cursor-pointer"
        onClick={() => navigate("/")}
        >
            <img src={movie_navbar} className="h-full object-contain"/>
        </li>
        <motion.li
          className="h-full px-2 flex justify-end items-center cursor-pointer"
          onClick={() => navigate("/")}
          whileTap={{scale:0.9}}
          whileHover={{scale:1.1}}
        >
          <p className="text-zinc-300 text-2xl">Home</p>
        </motion.li>
      </ul>
    </div>
  );
}

export default Navbar;
