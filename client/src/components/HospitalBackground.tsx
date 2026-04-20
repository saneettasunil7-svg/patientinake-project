export default function HospitalBackground() {
    return (
        <div
            className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat opacity-[0.05] mix-blend-multiply pointer-events-none"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop')" }}
        />
    );
}
