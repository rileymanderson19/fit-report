import ButtonAccount from "@/components/ButtonAccount";

export default function AccountPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Account</h1>
        <ButtonAccount />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p>Manage your account settings here</p>
      </div>
    </div>
  );
} 