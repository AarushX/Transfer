do $$ begin
	if not exists (
		select 1
		from pg_enum e
		join pg_type t on t.oid = e.enumtypid
		where t.typname = 'node_block_type'
			and e.enumlabel = 'reading'
	) then
		alter type public.node_block_type add value 'reading';
	end if;
end $$;
