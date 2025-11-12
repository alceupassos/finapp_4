import { Variants, Transition } from "framer-motion"

export const transitionFast: Transition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
export const transitionMedium: Transition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] }

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transitionMedium },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: transitionMedium },
}

export const scaleOnHover = {
  whileHover: { scale: 1.02 },
  transition: transitionFast,
}

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
}

export const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: transitionFast },
}

