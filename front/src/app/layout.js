import "./globals.css"
import { ToastContainer } from "react-toastify"

export const metadata = {
  title: "Sistema de Atendimento de Leads",
  description: "Sistema de Atendimento de Leads com IA",
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0&display=optional"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
      </head>
      <body>
        {children}
        <ToastContainer theme="colored" />
      </body>
    </html>
  )
}
