import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema(
  {
    groupUrl: { type: String, required: true, index: true },
    groupTitle: { type: String },
    member: { type: mongoose.Schema.Types.Mixed, required: true },
    scrapedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

const MemberModel = mongoose.models.Member || mongoose.model("Member", MemberSchema);

// Drop stale unique index on top-level profileUrl (field lives inside member.profileUrl now)
MemberModel.collection.dropIndex("profileUrl_1").catch(() => {
  // Index may not exist — ignore
});

export default MemberModel;

