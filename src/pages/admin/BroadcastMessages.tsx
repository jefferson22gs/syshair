import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { BroadcastMessagesComponent } from "@/components/admin/BroadcastMessagesEnhanced";

const BroadcastMessages = () => {
  return (
    <AdminLayout>
      <BroadcastMessagesComponent />
    </AdminLayout>
  );
};

export default BroadcastMessages;
