export function MobileScreen() {
    return <div className="z-10 w-full h-[100vh] bg-white fixed top-0 left-0 md:hidden">
        <div className="p-[23px]">
            {/* <img src="/logo.png"/> */}
        </div>
        <div className="p-[25px] grid gap-2 pt-[200px] font-medium">
            <div className="text-4xl">
                Ваше устройство не поддерживается
            </div>
            <div className="text-xl text-gray-500">
                Используйте ПК для доступа к конструктору
            </div>
        </div>
        <img className="fixed bottom-0 right-0" src="/mobile.png" alt="" />
    </div>
}
