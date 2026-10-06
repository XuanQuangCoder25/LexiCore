import React, { useState } from 'react';
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Checkbox } from "../../ui/checkbox";
import { Label } from "../../ui/label";
import { Plus, GripVertical, Type, Headphones, Mic, X, Video, Hand, MousePointerClick } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ILessonBlock {
  id: string;
  type: 'text' | 'audio' | 'fill_in_the_blank' | 'speech_recognition' | 'video' | 'drag_drop';
  content: string;
  metadata?: any;
}

const SortableBlock = ({ block, updateBlock, removeBlock, updateMetadata }: { block: ILessonBlock, updateBlock: (id: string, newContent: string) => void, removeBlock: (id: string) => void, updateMetadata: (id: string, newMeta: any) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start p-3 bg-card border rounded-lg shadow-sm group">
      <div {...attributes} {...listeners} className="mt-2 cursor-grab opacity-50 group-hover:opacity-100">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
          {block.type === 'text' && <><Type className="w-3 h-3"/> Văn bản</>}
          {block.type === 'audio' && <><Headphones className="w-3 h-3"/> Âm thanh</>}
          {block.type === 'video' && <><Video className="w-3 h-3"/> Video (Kèm Shadowing)</>}
          {block.type === 'fill_in_the_blank' && <><Type className="w-3 h-3"/> Điền từ (dùng [từ] để tạo chỗ trống)</>}
          {block.type === 'drag_drop' && <><MousePointerClick className="w-3 h-3"/> Kéo thả từ (dùng [từ] để tạo chỗ trống)</>}
          {block.type === 'speech_recognition' && <><Mic className="w-3 h-3"/> Luyện nói</>}
        </div>
        
        {(block.type === 'text' || block.type === 'fill_in_the_blank' || block.type === 'drag_drop') && (
          <Textarea 
            value={block.content} 
            onChange={(e) => updateBlock(block.id, e.target.value)} 
            placeholder={block.type === 'text' ? "Nhập nội dung..." : "Vd: Xin chào, [tên] của tôi là..."} 
            className="min-h-[80px]" 
          />
        )}
        
        {(block.type === 'audio' || block.type === 'speech_recognition') && (
          <Input 
            value={block.content} 
            onChange={(e) => updateBlock(block.id, e.target.value)} 
            placeholder={block.type === 'audio' ? "URL file âm thanh (mp3)..." : "Câu mẫu yêu cầu học viên đọc..."} 
          />
        )}
        
        {block.type === 'video' && (
          <div className="space-y-3">
            <Input 
              value={block.content} 
              onChange={(e) => updateBlock(block.id, e.target.value)} 
              placeholder="URL Video (YouTube, MP4)..." 
            />
            <div className="p-3 bg-muted/50 rounded-md space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Tùy chọn chức năng Shadowing</p>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`transcript-${block.id}`} 
                  checked={block.metadata?.showTranscript !== false} 
                  onCheckedChange={(c) => updateMetadata(block.id, { ...block.metadata, showTranscript: c })}
                />
                <Label htmlFor={`transcript-${block.id}`} className="text-sm cursor-pointer">Hiện phụ đề (Interactive Transcript)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`pronunciation-${block.id}`} 
                  checked={block.metadata?.enablePronunciationCheck === true} 
                  onCheckedChange={(c) => updateMetadata(block.id, { ...block.metadata, enablePronunciationCheck: c })}
                />
                <Label htmlFor={`pronunciation-${block.id}`} className="text-sm cursor-pointer">Bật tính năng chấm điểm phát âm (Pronunciation Check)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`recording-${block.id}`} 
                  checked={block.metadata?.enableRecording === true} 
                  onCheckedChange={(c) => updateMetadata(block.id, { ...block.metadata, enableRecording: c })}
                />
                <Label htmlFor={`recording-${block.id}`} className="text-sm cursor-pointer">Bật tính năng thu âm so sánh giọng (Recording)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`loop-${block.id}`} 
                  checked={block.metadata?.enableLoop === true} 
                  onCheckedChange={(c) => updateMetadata(block.id, { ...block.metadata, enableLoop: c })}
                />
                <Label htmlFor={`loop-${block.id}`} className="text-sm cursor-pointer">Bật tính năng lặp lại 1 câu (Loop)</Label>
              </div>
            </div>
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon" className="text-destructive opacity-50 group-hover:opacity-100" onClick={() => removeBlock(block.id)}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export const LessonBlockEditor = ({ blocks, setBlocks }: { blocks: ILessonBlock[], setBlocks: (b: ILessonBlock[]) => void }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      setBlocks(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const addBlock = (type: ILessonBlock['type']) => {
    let initialMetadata = {};
    if (type === 'video') {
      initialMetadata = { showTranscript: true, enablePronunciationCheck: false, enableRecording: false, enableLoop: false };
    }
    setBlocks([...blocks, { id: Date.now().toString(), type, content: '', metadata: initialMetadata }]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };
  
  const updateMetadata = (id: string, metadata: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, metadata } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {blocks.map(block => (
              <SortableBlock key={block.id} block={block} updateBlock={updateBlock} removeBlock={removeBlock} updateMetadata={updateMetadata} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <div className="flex flex-wrap gap-2 pt-2">
        <span className="text-sm text-muted-foreground flex items-center mr-2">Thêm khối:</span>
        <Button size="sm" variant="outline" onClick={() => addBlock('text')}><Type className="w-3 h-3 mr-1"/> Text</Button>
        <Button size="sm" variant="outline" onClick={() => addBlock('video')}><Video className="w-3 h-3 mr-1"/> Video (Shadowing)</Button>
        <Button size="sm" variant="outline" onClick={() => addBlock('fill_in_the_blank')}><Type className="w-3 h-3 mr-1"/> Điền từ (Gõ)</Button>
        <Button size="sm" variant="outline" onClick={() => addBlock('drag_drop')}><MousePointerClick className="w-3 h-3 mr-1"/> Điền từ (Kéo thả)</Button>
        <Button size="sm" variant="outline" onClick={() => addBlock('audio')}><Headphones className="w-3 h-3 mr-1"/> Audio</Button>
        <Button size="sm" variant="outline" onClick={() => addBlock('speech_recognition')}><Mic className="w-3 h-3 mr-1"/> Luyện nói</Button>
      </div>
    </div>
  );
};
