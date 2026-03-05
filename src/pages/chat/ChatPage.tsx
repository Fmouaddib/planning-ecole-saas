/**
 * Page Chat — layout 3 colonnes (channels | messages | info)
 * Responsive : 1 colonne mobile, 2 tablet, 3 desktop
 */
import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useChatMembers } from '@/hooks/useChatMembers'
import { useAuthContext } from '@/contexts/AuthContext'
import { HelpBanner } from '@/components/ui'
import { ChannelList } from './ChannelList'
import { MessageView } from './MessageView'
import { InfoPanel } from './InfoPanel'
import { NewDMModal } from './NewDMModal'

type MobileView = 'channels' | 'messages' | 'info'

function ChatPage() {
  const { user } = useAuthContext()
  const chat = useChat()
  const messages = useChatMessages(chat.activeChannelId)
  const members = useChatMembers(chat.activeChannelId)
  const [showInfo, setShowInfo] = useState(true)
  const [showNewDM, setShowNewDM] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('channels')

  // Auto-open DM if navigated via navigateToDM()
  useEffect(() => {
    const target = sessionStorage.getItem('chat_dm_target')
    if (target) {
      sessionStorage.removeItem('chat_dm_target')
      chat.createDM(target).then(channelId => {
        if (channelId) setMobileView('messages')
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectChannel = (id: string) => {
    chat.setActiveChannelId(id)
    chat.markAsRead(id)
    setMobileView('messages')
  }

  const handleNewDM = async (userId: string) => {
    const channelId = await chat.createDM(userId)
    if (channelId) {
      setMobileView('messages')
    }
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <HelpBanner storageKey="chat">
        Échangez avec vos collègues et étudiants en temps réel. Les canaux de classe et de matière sont créés automatiquement. Cliquez sur « Nouveau message » pour démarrer une conversation privée.
      </HelpBanner>

      <div className="flex-1 flex border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 min-h-0">
        {/* Column 1: Channel list */}
        <div className={`w-64 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 ${
          mobileView === 'channels' ? 'block' : 'hidden md:block'
        }`}>
          <ChannelList
            dmChannels={chat.dmChannels}
            classChannels={chat.classChannels}
            subjectChannels={chat.subjectChannels}
            activeChannelId={chat.activeChannelId}
            onSelect={handleSelectChannel}
            searchQuery={chat.searchQuery}
            onSearchChange={chat.setSearchQuery}
            onNewDM={() => setShowNewDM(true)}
            onlineUserIds={members.onlineUserIds}
          />
        </div>

        {/* Column 2: Messages */}
        <div className={`flex-1 flex flex-col min-w-0 ${
          mobileView === 'messages' ? 'block' : 'hidden md:flex'
        }`}>
          {chat.activeChannel ? (
            <MessageView
              channel={chat.activeChannel}
              messages={messages.messages}
              isLoading={messages.isLoading}
              hasMore={messages.hasMore}
              onLoadMore={messages.loadMore}
              onSend={messages.sendMessage}
              onEdit={messages.editMessage}
              onDelete={messages.deleteMessage}
              onReact={messages.toggleReaction}
              typingUserIds={members.typingUserIds}
              members={members.members}
              onSetTyping={members.setTyping}
              onToggleInfo={() => {
                setShowInfo(!showInfo)
                if (window.innerWidth < 768) setMobileView('info')
              }}
              currentUserId={user?.id || ''}
              onBack={() => setMobileView('channels')}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
              <MessageCircle size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Sélectionnez une conversation</p>
              <p className="text-xs mt-1">ou créez un nouveau message</p>
            </div>
          )}
        </div>

        {/* Column 3: Info panel */}
        {showInfo && chat.activeChannel && (
          <div className={`w-72 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 ${
            mobileView === 'info' ? 'block' : 'hidden lg:block'
          }`}>
            <InfoPanel
              channel={chat.activeChannel}
              members={members.members}
              onlineUserIds={members.onlineUserIds}
              currentUserId={user?.id || ''}
              onStartDM={handleNewDM}
              onClose={() => {
                setShowInfo(false)
                if (window.innerWidth < 768) setMobileView('messages')
              }}
            />
          </div>
        )}
      </div>

      {/* New DM modal */}
      <NewDMModal
        isOpen={showNewDM}
        onClose={() => setShowNewDM(false)}
        onSelect={handleNewDM}
      />
    </div>
  )
}

export default ChatPage
