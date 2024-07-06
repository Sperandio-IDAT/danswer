"use client";

import { FiEdit, FiFolderPlus } from "react-icons/fi";
import {
  Dispatch,
  ForwardedRef,
  forwardRef,
  SetStateAction,
  useContext,
  useEffect,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BasicClickable } from "@/components/BasicClickable";
import { ChatSession } from "../interfaces";

import {
  NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED,
  NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA,
} from "@/lib/constants";

import { ChatTab } from "./ChatTab";
import { Folder } from "../folders/interfaces";
import { createFolder } from "../folders/FolderManagement";
import { usePopup } from "@/components/admin/connectors/Popup";
import { SettingsContext } from "@/components/settings/SettingsProvider";

import React from "react";
import { FaBrain } from "react-icons/fa";
import { Logo } from "@/components/Logo";
import { HeaderTitle } from "@/components/header/Header";
import { TbLayoutSidebarRightExpand } from "react-icons/tb";
import { LefToLineIcon, RightToLineIcon } from "@/components/icons/icons";

interface HistorySidebarProps {
  search?: boolean;
  existingChats?: ChatSession[];
  currentChatSession?: ChatSession | null | undefined;
  folders?: Folder[];
  openedFolders?: { [key: number]: boolean };
  toggleSidebar?: () => void;
  toggled?: boolean;
}
// forwardRef<HTMLDivElement, DocumentSidebarProps>(
export const HistorySidebar = forwardRef<HTMLDivElement, HistorySidebarProps>(
  (
    {
      toggled,
      search,
      existingChats,
      currentChatSession,
      folders,
      openedFolders,
      toggleSidebar,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const router = useRouter();
    const { popup, setPopup } = usePopup();

    const currentChatId = currentChatSession?.id;

    // prevent the NextJS Router cache from causing the chat sidebar to not
    // update / show an outdated list of chats
    useEffect(() => {
      router.refresh();
    }, [currentChatId]);

    const combinedSettings = useContext(SettingsContext);
    if (!combinedSettings) {
      return null;
    }
    const settings = combinedSettings.settings;
    const enterpriseSettings = combinedSettings.enterpriseSettings;

    return (
      <>
        {popup}
        <div
          ref={ref}
          className={`
            flex
            flex-none
            bg-background-weak
            w-full
            border-r 
            border-border 
            flex 
            flex-col relative
            h-screen
            transition-transform`}
        >
          <div className="ml-4 mr-3 flex flex gap-x-1 items-center text-neutral-700 mt-2 my-auto text-xl ">
            <Logo />
            {enterpriseSettings && enterpriseSettings.application_name ? (
              <HeaderTitle>{enterpriseSettings.application_name}</HeaderTitle>
            ) : (
              <HeaderTitle>Danswer</HeaderTitle>
            )}
            <button className="ml-auto" onClick={toggleSidebar}>
              {!toggled ? <RightToLineIcon /> : <LefToLineIcon />}
            </button>
          </div>
          <div className="flex items-center">
            <Link
              href={
                "/chat" +
                (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA &&
                currentChatSession
                  ? `?assistantId=${currentChatSession.persona_id}`
                  : "")
              }
              className="ml-3 mt-2 w-full"
            >
              <BasicClickable inset fullWidth>
                <div className="flex items-center text-sm">
                  <FiEdit className="ml-1 mr-2" /> New Chat
                </div>
              </BasicClickable>
            </Link>

            <div className="ml-1.5 mr-3 h-full">
              <BasicClickable
                inset
                onClick={() =>
                  createFolder("New Folder")
                    .then((folderId) => {
                      console.log(`Folder created with ID: ${folderId}`);
                      router.refresh();
                    })
                    .catch((error) => {
                      console.error("Failed to create folder:", error);
                      setPopup({
                        message: `Failed to create folder: ${error.message}`,
                        type: "error",
                      });
                    })
                }
              >
                <div className="flex items-center text-sm h-full">
                  <FiFolderPlus className="mx-1 my-auto" />
                </div>
              </BasicClickable>
            </div>
          </div>

          <Link href="/assistants/mine" className="mt-3 mb-1 mx-3">
            <BasicClickable inset fullWidth>
              <div className="flex items-center text-default font-medium">
                <FaBrain className="ml-1 mr-2" /> Manage Assistants
              </div>
            </BasicClickable>
          </Link>

          <div className="border-b border-border pb-4 mx-3" />

          <ChatTab
            search={search}
            existingChats={existingChats}
            currentChatId={currentChatId}
            folders={folders}
            openedFolders={openedFolders}
          />
        </div>
      </>
    );
  }
);
HistorySidebar.displayName = "HistorySidebar";
