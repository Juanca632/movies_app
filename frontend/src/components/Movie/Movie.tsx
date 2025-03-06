import { motion } from "motion/react"
import "./Movie.scss"

interface MovieProps{
    title: string;
    imageUrl: string;
}

function Movie({title, imageUrl}: MovieProps) {
  return (
    <motion.div className='movie bg-blue-700 rounded-xl relative'
        whileHover={{scale:1, zIndex: 10 }}
    >
        <img src={imageUrl} alt={title} className="rounded-md h-full"/>
        <motion.div className="absolute bg-gradient-to-t from-black to-transparent w-full h-full top-0 right-0 bottom-0 left-0 z-20 rounded-md"
          initial={{ opacity: 0 }}
          whileHover={{opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-full w-full flex items-end p-2">
            <p className="text-white text-xl text-center w-full">{title}</p>
          </div>
        </motion.div>
    </motion.div>
  )
}

export default Movie